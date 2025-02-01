class MockBucket {
  constructor(name) {
    this.name = name;
  }

  iam = {
    getPolicy: async () => [
      {
        bindings: [
          { role: "roles/storage.objectViewer", members: ["allUsers"] },
        ],
      },
    ],
  };
}

class MockStorage {
  bucket(name) {
    return new MockBucket(name);
  }
}

export { MockStorage as Storage };
