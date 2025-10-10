import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLBoolean,
} from 'graphql';
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
    audioFileUri: { type: GraphQLString },
  },
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

const PositionInputType = new GraphQLInputObjectType({
  name: 'PositionInput',
  fields: {
    x: { type: new GraphQLNonNull(GraphQLFloat) },
    y: { type: new GraphQLNonNull(GraphQLFloat) },
    z: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const EmitterInputType = new GraphQLInputObjectType({
  name: 'EmitterInput',
  fields: {
    id: { type: GraphQLInt },
    position: { type: new GraphQLNonNull(PositionInputType) },
    audioFileUri: { type: GraphQLString },
  },
});

const ListenerInputType = new GraphQLInputObjectType({
  name: 'ListenerInput',
  fields: {
    id: { type: GraphQLInt },
    position: { type: new GraphQLNonNull(PositionInputType) },
  },
});

const ScenarioFilterInput = new GraphQLInputObjectType({
  name: 'ScenarioFilterInput',
  fields: {
    name: { type: GraphQLString },
    createdAfter: { type: GraphQLString },
    createdBefore: { type: GraphQLString },
    updatedAfter: { type: GraphQLString },
    updatedBefore: { type: GraphQLString },
    minDevices: { type: GraphQLInt },
    maxDevices: { type: GraphQLInt },
  },
});

const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    scenario: {
      type: ScenarioType,
      args: { id: { type: new GraphQLNonNull(GraphQLInt) } },
      resolve: (_, args) => scenarioService.loadScenarioFromDB(args.id),
    },
    scenarios: {
      type: new GraphQLList(ScenarioType),
      args: {
        filters: { type: ScenarioFilterInput },
      },
      resolve: (_, args) => scenarioService.listScenarios(args.filters || {}),
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createScenario: {
      type: GraphQLInt,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        emitters: { type: new GraphQLList(EmitterInputType) },
        listeners: { type: new GraphQLList(ListenerInputType) },
      },
      resolve: async (_, args) => {
        return await scenarioService.createScenario({
          name: args.name,
          emitters: args.emitters || [],
          listeners: args.listeners || [],
        });
      },
    },
    updateScenario: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        emitters: { type: new GraphQLList(EmitterInputType) },
        listeners: { type: new GraphQLList(ListenerInputType) },
      },
      resolve: async (_, args) => {
        await scenarioService.updateScenario(args.id, {
          name: args.name,
          emitters: args.emitters || [],
          listeners: args.listeners || [],
        });
        return true;
      },
    },
    deleteScenario: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_, args) => {
        await scenarioService.deleteScenario(args.id);
        return true;
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});

