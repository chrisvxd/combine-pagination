# combine-pagination 🦑

`combine-pagination` is a JavaScript library for paginating across multiple data sources at once, whilst retaining the sort order.

* **Great for Infinity Scroll**: easily support multiple data sources in your infinity scroll.
* **Retain order**: your data is always in order, even when it comes from different sources.
* **Service agnostic**: work with any data service, whether REST, GraphQL, Algolia or more.
* **Mix-and-match services**: mix and match data services as you see fit, making one query from GraphQL and one from Algolia.
* **Efficient**: only fetch data when needed for that data source.

Used in production at https://wellpaid.io.

## Installation

```sh
npm i combine-pagination --save
```

or

```sh
yarn add combine-pagination
```

## Quick Start

If you already understand the problem space, here’s a quick example for paginating across two data sets:

```js
const combinedGetters = combinePagination({
  getters: [page => getDataA(page), page => getDataB(page)],
  sortKey: "popularity"
});

const pageOne = combinedGetters.getNext();
const pageTwo = combinedGetters.getNext();
```

## The Problem

Suppose you have two data sets, `modernHats` and `oldHats`, and you want to combine them into one data set sorted by `popularity` called `hats`:

```js
const modernHats = [
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Beanie",
    popularity: 50
  },
  {
    name: "Golf",
    popularity: 20
  }
];

const oldHats = [
  {
    name: "Top Hat",
    popularity: 85
  },
  {
    name: "Beret",
    popularity: 15
  },
  {
    name: "Bowler Cap",
    popularity: 9
  }
];
```

In this example, we’ll be paginating 2 results at a time. Let’s create a getter to paginate our data:

```js
const getData = (data, page) => data.slice((page - 1) * 2, page * 2);
```

> Note, in reality you probably already have a data getting with pagination support to retrieve the data via a server.

Now let's get our data. Without using `combine-pagination`, we might be tempted to just paginate each, sort and combine them. **This is what NOT to do:**

```js
const modernHatsPage = getData(modernHats, 0);
const oldHatsPage = getData(oldHats, 0);

const hats = [...modernHatsPage, ...oldHatsPage].sort(
  (a, b) => a.popularity - b.popularity
);
```

This will result in hats that looks like this

```js
[
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Top Hat",
    popularity: 85
  },
  {
    name: "Beanie",
    popularity: 50
  },
  {
    name: "Beret",
    popularity: 15
  }
];
```

This looks fine, until you query the second page, which will look like this

```js
[
  {
    name: "Golf",
    popularity: 20
  },
  {
    name: "Bowler Cap",
    popularity: 9
  }
];
```

If we combine these results, you’ll notice that now the **results are out of order**. Sure, we could resort our entire data set, but this has some problems:

1. Reordering UI is confusing - If we’re rendering `hats` in a UI, such as an infinity scroll, it will cause the UI to reorder and confuse the user.
2. Inefficient sort - resorting the entire data set on each pagination is highly inefficient.
3. Unnecessary data request - depending on the order, getting both data sets at once might be unnecessary.

## The Solution

Using the data set from above, let's combine the getters using `combine-pagination`:

```js
import combinePagination from "combine-pagination";

const combinedGetters = combinePagination({
  getters: [page => getData(modernHats, page), page => getData(oldHats, page)],
  sortKey: "popularity"
});
```

And query the first page:

```js
const page = combinedGetters.getNext();
```

Resulting in:

```js
[
  {
    name: "Baseball Cap",
    popularity: 95
  },
  {
    name: "Top Hat",
    popularity: 85
  },
  {
    name: "Beanie",
    popularity: 50
  }
];
```

This time we only returned three results. `combine-pagination` is only showing intersecting data, holding one result back until it receives the next data set. This means you can't define exactly how many results you want to receive. See [Fuzzy Pagination]().

The second time we run `getNext()`, we get the next set of data, but this time in the correct order:

```js
[
  {
    name: "Golf",
    popularity: 20
  },
  {
    name: "Beret",
    popularity: 15
  },
  {
    name: "Bowler Cap",
    popularity: 9
  }
];
```

> Note to self: the above result might be incorrect when compared with actual results. Need tests.

`combine-pagination` noticed that "Beret", which was held back from the first set of results, intersects "Golf" and "Bowler Cap", so has inserted it and sorted the page.

That's it. Each time you call `getNext()`, you'll retreive the next set of data, until the data source is exhausted.

## Fuzzy Pagination

Each time you execute `getNext()`, you can't be sure how many results you're going to receive. We call this **Fuzzy Pagination**, which returns `0 - n` results for any given page with page size `n`. This technique is best suited for infinity scroll type use cases.

In normal pagination, you would receive `n` results for each page, only receiving `0 - n` results on the final page.

## Use cases

* Using infinity scroll across multiple data sources.
* Paginating across multiple Algolia queries, such as one geo location query and one not.
* Paginating across different services.
