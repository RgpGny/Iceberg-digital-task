export const useApi = () => {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiUrl as string;

  async function get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return $fetch<T>(path, {
      baseURL,
      method: 'GET',
      query,
    });
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    return $fetch<T>(path, {
      baseURL,
      method: 'POST',
      body,
    });
  }

  async function del<T>(path: string): Promise<T> {
    return $fetch<T>(path, {
      baseURL,
      method: 'DELETE',
    });
  }

  return { get, post, del };
};
