import Sqids from "sqids";

const sqids = new Sqids({
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  minLength: 4,
});

export { sqids };
