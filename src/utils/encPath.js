export function encPath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}
