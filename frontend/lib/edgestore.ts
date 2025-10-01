"use client";
// Mocked EdgeStore for standalone version
const { EdgeStoreProvider, useEdgeStore } = {
  EdgeStoreProvider: ({ children }: any) => children,
  useEdgeStore: () => ({
    publicFiles: {
      upload: async (file: any) => {
        console.log('Mock EdgeStore upload:', file);
        return { url: URL.createObjectURL(file) };
      }
    }
  })
};
export { EdgeStoreProvider, useEdgeStore };
