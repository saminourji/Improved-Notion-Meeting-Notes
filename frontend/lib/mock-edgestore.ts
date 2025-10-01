// Mock EdgeStore for development - replace with real implementation or remove
export const useEdgeStore = () => ({
  edgestore: {
    publicFiles: {
      upload: async (options: { file: File }) => {
        // Mock upload - in real app, this would upload to your backend
        return {
          url: URL.createObjectURL(options.file),
        };
      },
    },
  },
});
