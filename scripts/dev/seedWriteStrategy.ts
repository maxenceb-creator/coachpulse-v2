export const queueDocumentReplacement = <Reference, Data>(
  set: (reference: Reference, data: Data) => unknown,
  reference: Reference,
  data: Data,
) => set(reference, data)
