import _ from "lodash";

let __docs = {};
let __indices = {};

const setupMock = (indices = {}, docs = {}) => {
  __indices = indices;
  __docs = docs;
};

const esMock = {
  Client: () => ({
    cluster: {
      stats: mockStats,
    },
    indices: {
      exists: mockExists,
      existsAlias: mockExistsAlias,
      existsTemplate: mockExistsTemplate,
      getTemplate: mockGetTemplate,
      getMapping: mockGetMapping,
      getAlias: mockGetAlias,
      create: mockCreate,
      delete: mockDelete,
      updateAliases: mockUpdateAliases,
      putTemplate: mockPutTemplate,
    },
    ingest: {
      getPipeline: mockGetPipeline,
      putPipeline: mockPutPipeline,
    },
    reindex: mockReindex,
    ping: () => {},
    index: () => {},
    get: () => {},
    update: () => {},
    __setupMock: setupMock,
  }),
};

const mockStats = opts => {
  return {
    nodes: {
      versions: ["7.6.0"],
    },
  };
};

const mockExists = opts => {
  return Object.keys(__indices).includes(opts.index);
};

const mockExistsAlias = opts => {
  const result =
    Object.values(__indices).findIndex(item => {
      return Object.keys(item.aliases).includes(opts.name);
    }) >= 0;
  return result;
};

const mockGetMapping = opts => {
  return {
    [opts.index]: {
      mappings: __indices[opts.index].mappings,
    },
  };
};

const mockGetAlias = opts => {
  const result = {};
  Object.keys(__indices).forEach(key => {
    if (__indices[key].aliases) {
      if (Object.keys(__indices[key].aliases).includes(opts.name)) {
        result[key] = {};
      }
    }
  });
  return result;
};

const mockUpdateAliases = opts => {
  opts.body.actions.forEach(action => {
    if (action.add) {
      if (__indices[action.add.index].aliases) {
        __indices[action.add.index].aliases[action.add.alias] = {};
      } else {
        __indices[action.add.index].aliases = {
          [action.add.alias]: {},
        };
      }
    }
  });
};

const mockCreate = opts => {
  __indices[opts.index] = JSON.parse(opts.body);
  __docs[opts.index] = [];
};

const mockReindex = opts => {
  let sourceIndexKey;
  if (__indices[opts.body.source.index]) {
    sourceIndexKey = opts.body.source.index;
  } else {
    sourceIndexKey = Object.keys(__indices).find(key =>
      Object.keys(__indices[key].aliases).includes(opts.body.source.index)
    );
  }

  if (!__indices[opts.body.dest.index]) {
    __indices[opts.body.dest.index] = _.cloneDeep(__indices[sourceIndexKey]);
    __docs[opts.body.dest.index] = [];
  }

  __docs[sourceIndexKey].forEach(doc => {
    __docs[opts.body.dest.index].push(_.cloneDeep(doc));
  });
};

const mockDelete = opts => {
  delete __indices[opts.index];
  delete __docs[opts.index];
};

const mockGetPipeline = opts => {
  return {
    [opts.id]: {},
  };
};

const mockGetTemplate = opts => {
  return {
    [opts.name]: {
      mappings: {},
    },
  };
};

const mockPutPipeline = opts => {
  return true;
};

const mockPutTemplate = opts => {
  return true;
};

const mockExistsTemplate = opts => {
  return true;
};

export default esMock;
