import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const decideCorrectionFn = httpsCallable(functions, "decideCorrection");

export async function decideCorrection(correctionId, decision, note) {
  const res = await decideCorrectionFn({ correctionId, decision, note });
  return res.data;
}
