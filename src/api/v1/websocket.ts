import { Server, Socket } from "socket.io";
import * as scenarioService from "../../services/scenario.service";

interface Emitter {
  id: number;
  x: number;
  y: number;
  z: number;
  audioFileUri: string | null;
}

interface Listener {
  id: number;
  x: number;
  y: number;
  z: number;
}

interface ScenarioState {
  id: number;
  name: string;
  emitters: Emitter[];
  listeners: Listener[];
}

const scenarioStates = new Map<number, ScenarioState>();

function getRoomSize(io: Server, roomName: string) {
  const room = io.sockets.adapter.rooms.get(roomName);
  return room ? room.size : 0;
}

export function initWebSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinScenario", async (scenarioIdRaw: string | number) => {
      const scenarioId = Number(scenarioIdRaw);
      if (isNaN(scenarioId)) return;

      const roomName = `scenario:${scenarioId}`;
      socket.join(roomName);

      if (!scenarioStates.has(scenarioId)) {
        try {
          const initialScenarios = await scenarioService.loadScenarioFromDB(scenarioId);
          const initialStates = {
            ...initialScenarios,
            emitters: initialScenarios.emitters.map(e => { return { id: e.id, x: e.position.x, y: e.position.y, z: e.position.z, audioFileUri: e.audioFileUri } }),
            listeners: initialScenarios.listeners.map(e => { return { id: e.id, x: e.position.x, y: e.position.y, z: e.position.z } })
          };
          scenarioStates.set(scenarioId, initialStates);
        } catch (err) {
          console.error("Failed to load scenario:", err);
          socket.emit("error", "Failed to load scenario");
          return;
        }
      }

      const scenario = scenarioStates.get(scenarioId);
      socket.emit("scenario:state", scenario);
      console.log(`Socket ${socket.id} joined ${roomName}`);
    });

    socket.on(
      "scenario:update",
      (data: { scenarioId: number; action: string; payload: any }) => {
        const { scenarioId, action, payload } = data;
        const state = scenarioStates.get(scenarioId);
        if (!state) return;

        switch (action) {
          case "updateAudioFileUri": {
            const emitter = state.emitters.find((e) => e.id === payload.id);
            if (emitter) emitter.audioFileUri = payload.audioFileUri ?? null;
            break;
          }
          case "addEmitter":
            state.emitters.push(payload);
            break;
          case "deleteEmitter":
            state.emitters = state.emitters.filter((e) => e.id !== payload.id);
            break;
          case "addListener":
            state.listeners.push(payload);
            break;
          case "deleteListener":
            state.listeners = state.listeners.filter((l) => l.id !== payload.id);
            break;
          case "updateName":
            state.name = payload.name;
            break;
        }
        scenarioStates.set(scenarioId, state);

        socket.to(`scenario:${scenarioId}`).emit("scenario:update", { action, payload });
      }
    );

    socket.on("disconnecting", () => {
      console.log("Client disconnecting:", socket.id);

      socket.rooms.forEach((roomName) => {
        if (roomName.startsWith("scenario:")) {
          const scenarioId = Number(roomName.split(":")[1]);
          const roomSize = getRoomSize(io, roomName) - 1; // minus self
          if (roomSize <= 0) {
            console.log(`Dropping scenario state for ${scenarioId}`);
            scenarioStates.delete(scenarioId);
          }
        }
      });
    });
  });
}

