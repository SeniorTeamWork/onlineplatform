export function newestFirst(items = []) {
  return items
    .map((item, index) => ({
      item,
      index,
      time: Date.parse(item.createdAt) || 0,
    }))
    .sort(
      (first, second) =>
        second.time - first.time ||
        second.index - first.index
    )
    .map(({ item }) => item);
}
