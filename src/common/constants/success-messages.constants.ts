export const SUCCESS_MESSAGES = {
  CREATED: (resource: string) => `${resource} created successfully.`,
  UPDATED: (resource: string) => `${resource} updated successfully.`,
  DELETED: (resource: string) => `${resource} deleted successfully.`,
  FETCHED: (resource: string) => `${resource} retrieved successfully.`,
  LISTED: (resource: string) => `${resource} list retrieved successfully.`,
  OPERATION_SUCCESSFUL: 'Operation completed successfully.',
} as const;
