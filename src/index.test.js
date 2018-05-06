import { createMonoQuery, gql } from "./";
import graphql from "graphql-tag";
import { print } from "graphql/language";

test("build, run distribute simple query", async () => {
  const fragments = {
    simpleFragment: gql`
      fragment SimpleFragment on Query {
        something
      }
    `,
    withGraphQLTag: graphql`
      fragment AnotherFragment on Query {
        anotherThing
      }
    `
  };
  const monoQuery = createMonoQuery(({ query, variables, operationName }) => {
    expect(print(query)).toMatchSnapshot();
    return Promise.resolve({
      data: {
        hello: "world",
        something: "good",
        anotherThing: "hey"
      }
    });
  });
  const result = await monoQuery({
    query: gql`
      {
        hello
        ...SimpleFragment
        ...AnotherFragment
      }
      ${fragments.simpleFragment}
      ${fragments.withGraphQLTag}
    `
  });
  expect(result.getResultsFor(fragments)).toEqual({
    simpleFragment: { something: "good" },
    withGraphQLTag: { anotherThing: "hey" }
  });
});

test("you can pass data instead of a fetcher", () => {
  const fragments = {
    simpleFragment: gql`
      fragment SimpleFragment on Query {
        something
      }
    `,
    withGraphQLTag: graphql`
      fragment AnotherFragment on Query {
        anotherThing
      }
    `
  };
  const monoQuery = createMonoQuery({
    data: {
      hello: "world",
      something: "good",
      anotherThing: "hey"
    }
  });
  const result = monoQuery({
    query: gql`
      {
        hello
        ...SimpleFragment
        ...AnotherFragment
      }
      ${fragments.simpleFragment}
      ${fragments.withGraphQLTag}
    `
  });
  expect(result.getResultsFor(fragments)).toEqual({
    simpleFragment: { something: "good" },
    withGraphQLTag: { anotherThing: "hey" }
  });
});

test("it can handle null data", () => {
  const fragments = {
    simpleFragment: gql`
      fragment SimpleFragment on Query {
        something
      }
    `
  };
  const monoQuery = createMonoQuery({
    data: {}
  });
  const result = monoQuery({
    query: gql`
      {
        aThingThatIsNull {
          ...SimpleFragment
        }
      }
      ${fragments.simpleFragment}
    `
  });
  expect(result.getResultsFor(fragments)).toEqual({
    simpleFragment: {}
  });
});

describe("when fragments are nested under lists", () => {
  it("follows the list index parameters passed", () => {
    const fragments = {
      fragmentInLists: gql`
        fragment FragmentInLists on Query {
          something
        }
      `
    };
    const createListItem = name => ({
      anotherList: [{ something: name + "1" }, { something: name + "2" }]
    });
    const monoQuery = createMonoQuery({
      data: {
        someList: [createListItem("A"), createListItem("B")]
      }
    });
    const result = monoQuery(
      {
        query: gql`
          {
            someList {
              anotherList {
                ...FragmentInLists
              }
            }
          }
          ${fragments.fragmentInLists}
        `
      },
      [1, 0]
    );
    expect(result.getResultsFor(fragments)).toEqual({
      fragmentInLists: {
        something: "B1"
      }
    });
  });
  it("throws an error when there are no list indexes", () => {
    const fragments = {
      fragmentInLists: gql`
        fragment FragmentInLists on Query {
          something
        }
      `
    };
    const monoQuery = createMonoQuery({
      data: {
        someList: [{ aThing: { something: "foo" } }]
      }
    });
    const result = monoQuery({
      query: gql`
        {
          someList {
            aThing {
              ...FragmentInLists
            }
          }
        }
        ${fragments.fragmentInLists}
      `
    });
    expect(() => result.getResultsFor(fragments)).toThrow(
      "Array path provided was not long enough"
    );
  });
});
