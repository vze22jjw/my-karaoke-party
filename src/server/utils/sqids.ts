import Sqids from "sqids";

const sqids = new Sqids({
  alphabet: "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789",
  minLength: 4,
});

export { sqids };
