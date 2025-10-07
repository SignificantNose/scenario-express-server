import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import * as scenarioService from '../services/scenario.service';

const PositionType = new GraphQLObjectType({
  name: 'Position',
  fields: {
    x: { type: GraphQLFloat },
    y: { type: GraphQLFloat },
    z: { type: GraphQLFloat },
  },
});

const EmitterType = new GraphQLObjectType({
  name: 'Emitter',
  fields: {
    id: { type: GraphQLInt },
    position: { type: PositionType },
    audioFileUri: { type: GraphQLString }
  }
});

const ListenerType = new GraphQLObjectType({
  name: 'Listener',
  fields: {
    id: { type: GraphQLInt },
    position: { type: PositionType },
  },
});

const ScenarioType = new GraphQLObjectType({
  name: 'Scenario',
  fields: {
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
    emitters: { type: new GraphQLList(EmitterType) },
    listeners: { type: new GraphQLList(ListenerType) },
  },
});


const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    scenario: {
      type: ScenarioType,
      args: { id: { type: GraphQLInt } },
      resolve: (_, args) => scenarioService.loadScenarioFromDB(args.id),
    },
    scenarios: {
      type: new GraphQLList(ScenarioType),
      resolve: () => scenarioService.listScenarios({}),
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createScenario: {
      type: GraphQLInt,
      args: {
        name: { type: GraphQLString },
        emitters: { type: GraphQLString },
        listeners: { type: GraphQLString },
      },
      resolve: async (_, args) => {
        const emitters = JSON.parse(args.emitters);
        const listeners = JSON.parse(args.listeners);
        return await scenarioService.createScenario({ name: args.name, emitters, listeners });
      },
    },
  },
});

export const schema = new GraphQLSchema({ query: RootQuery, mutation: Mutation });
