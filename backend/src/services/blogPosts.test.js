import * as blogPosts from "./blogPosts";
import { esClient } from "../lib/elasticsearch";

describe("blogPosts", () => {
  describe("updateItem", () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it("should update published_at property on unpublished item", async () => {
      jest
        .spyOn(Date.prototype, "toISOString")
        .mockReturnValue("2000-01-01T00:00:00.000Z");
      const savedPost = createFakeSavedPost();
      savedPost._source.is_published = false;
      jest.spyOn(esClient, "get").mockReturnValue({ body: savedPost });
      const mockUpdate = jest.spyOn(esClient, "update");

      const { id, type, author, ...updatePostPayload } = createFakePost();

      await blogPosts.updateItem(id, type, updatePostPayload);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate.mock.calls[0][0].body.doc.last_edited_at).toBe(
        "2000-01-01T00:00:00.000Z"
      );
      expect(mockUpdate.mock.calls[0][0].body.doc.published_at).toBe(
        "2000-01-01T00:00:00.000Z"
      );
    });

    it("should not update published_at property on published item", async () => {
      jest
        .spyOn(Date.prototype, "toISOString")
        .mockReturnValue("2000-01-01T00:00:00.000Z");
      jest
        .spyOn(esClient, "get")
        .mockReturnValue({ body: createFakeSavedPost() });
      const mockUpdate = jest.spyOn(esClient, "update");

      const { id, type, author, ...updatePostPayload } = createFakePost();

      await blogPosts.updateItem(id, type, updatePostPayload);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate.mock.calls[0][0].body.doc.last_edited_at).toBe(
        "2000-01-01T00:00:00.000Z"
      );
      expect(mockUpdate.mock.calls[0][0].body.doc.published_at).toBe(undefined);
    });
  });
});

function createFakePost() {
  return {
    id: "blogpost-5v4xo4",
    title: "Title",
    content: "Content",
    metadata: {
      content_type: "markdown",
      private_viewing_key: "2f9c3a10-844c-11ea-99e5-0d5f2a274474",
    },
    allow_comments: true,
    is_published: true,
    draft: null,
    type: "post",
    tags: ["Elasticsearch"],
    series: "Series",
    author: {
      name: "Author",
      email: "author@bigdataboutique.com",
      website: "",
    },
  };
}

function createFakeSavedPost() {
  return {
    _index: "blog-posts-9d1577dc",
    _type: "_doc",
    _id: "blogpost-5v4xo4",
    _version: 15,
    _seq_no: 32,
    _primary_term: 3,
    found: true,
    _source: {
      title: "Title",
      content: "Content",
      metadata: {
        content_type: "markdown",
        private_viewing_key: "2051ae10-853b-11ea-bde3-c5341e6cbbdf",
      },
      allow_comments: true,
      is_published: true,
      draft: {
        series: "Series",
        allow_comments: true,
        title: "Title",
        content: "Content\nYeah",
        tags: ["Elasticsearch"],
      },
      author: {
        name: "Author",
        email: "author@bigdataboutique.com",
        website: "",
      },
      type: "post",
      slug: "title",
      published_at: "2020-04-22T03:48:54.295Z",
      last_edited_at: "2020-04-23T08:19:18.039Z",
      tags: ["Elasticsearch", "{Series}"],
    },
  };
}
