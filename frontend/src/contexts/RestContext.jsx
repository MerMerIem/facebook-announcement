import {
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import axios from "axios";

const ApiContext = createContext();
export const useApi = () => useContext(ApiContext);

const ApiProvider = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create axios instance with default config
  const axiosInstance = axios.create({
    baseURL:
      "https://5000-firebase-e-commerce-1752167509315.cluster-l6vkdperq5ebaqo3qy4ksvoqom.cloudworkstations.dev",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  // Token refresh function
  const refreshToken = useCallback(async () => {
    if (isRefreshing) return false;

    setIsRefreshing(true);
    try {
      const response = await axiosInstance.get("/auth/me");
      setIsRefreshing(false);
      return response.status === 200 || response.status === 201;
    } catch (error) {
      setIsRefreshing(false);
      return false;
    }
  }, [isRefreshing]);

  // Generic API call function
  const makeApiCall = useCallback(
    async (method, url, body = null, config = {}) => {
      let data = null;
      let response = null;
      let responseCode = null;
      let error = null;
      let isLoading = true;

      try {
        // Make the initial API call
        const requestConfig = {
          method,
          url,
          ...config,
        };

        if (
          body &&
          (method.toLowerCase() === "post" ||
            method.toLowerCase() === "put" ||
            method.toLowerCase() === "patch")
        ) {
          requestConfig.data = body;
        }

        response = await axiosInstance(requestConfig);

        data = response.data;
        responseCode = response.status;
        isLoading = false;
      } catch (err) {
        error = err;
        responseCode = err.response?.status || null;

        // Handle 401 unauthorized
        if (responseCode === 401) {
          const tokenRefreshed = await refreshToken();

          if (tokenRefreshed) {
            try {
              // Retry the original request
              const requestConfig = {
                method,
                url,
                ...config,
              };

              if (
                body &&
                (method.toLowerCase() === "post" ||
                  method.toLowerCase() === "put" ||
                  method.toLowerCase() === "patch")
              ) {
                requestConfig.data = body;
              }

              response = await axiosInstance(requestConfig);
              data = response.data;
              responseCode = response.status;
              error = null; // Clear the error since retry succeeded
            } catch (retryErr) {
              error = retryErr;
              responseCode = retryErr.response?.status || null;
            }
          }
        }

        isLoading = false;
      }

      return [data, response, responseCode, error, isLoading];
    },
    [refreshToken]
  );

  // API methods
  /**
   * @typedef {Object} ApiConfig
   * @property {HeadersInit} [headers] - Custom headers to include in the request.
   * @property {number} [timeout] - Request timeout in milliseconds.
   * @property {boolean} [withCredentials] - Indicates whether or not cross-site Access-Control requests should be made using credentials such as cookies, authorization headers, or TLS client certificates.
   * @property {AbortSignal} [signal] - An AbortSignal object instance; allows you to communicate with a DOM request (such as a fetch request) and abort it if desired through an AbortController.
   * @property {RequestMode} [mode] - The mode you want to use for the request, e.g., "cors", "no-cors", or "same-origin".
   * @property {RequestCredentials} [credentials] - The request credentials policy to use for the request.
   * @property {RequestCache} [cache] - The cache mode you want to use for the request, e.g., "default", "no-store", "reload".
   * @property {RequestRedirect} [redirect] - The redirect mode to use for the request.
   * @property {string} [referrer] - A string specifying the referrer of the request.
   * @property {ReferrerPolicy} [referrerPolicy] - The referrer policy to use for the request.
   * @property {string} [integrity] - A cryptographic hash of the resource you're fetching.
   * @property {boolean} [keepalive] - Indicates whether the request should outlive the page.
   * @property {number} [priority] - The fetch priority of the request.
   */

  /**
   * @callback MakeApiCall
   * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} method - The HTTP method for the request.
   * @param {string} url - The URL endpoint for the API call.
   * @param {Object | Array | string | null} [body] - The request body for POST, PUT, or PATCH requests.
   * @param {ApiConfig} [config] - Optional configuration for the API call (e.g., headers, timeout).
   * @returns {Promise<any>} A promise that resolves with the API response data, or rejects with an error.
   */

  /**
   * Custom hook providing memoized API utility functions for common HTTP methods.
   * Each method internally uses `makeApiCall` and is memoized using `useCallback`
   * to ensure stable function references across renders, making it suitable for
   * use in React hooks dependencies.
   *
   * @param {MakeApiCall} makeApiCall - The underlying function responsible for
   * executing the actual API requests. This function should handle network
   * requests, parsing responses, and error handling. It's crucial for `makeApiCall`
   * to be stable (e.g., also wrapped in `useCallback` or defined outside the
   * component scope) for these memoized functions to be truly stable.
   *
   * @returns {Object} An object containing memoized functions for various HTTP methods.
   * @property {function(string, ApiConfig): Promise<any>} get - Performs a GET request.
   * @property {function(string, Object | Array | string | null, ApiConfig): Promise<any>} post - Performs a POST request with an optional request body.
   * @property {function(string, Object | Array | string | null, ApiConfig): Promise<any>} put - Performs a PUT request with an optional request body.
   * @property {function(string, Object | Array | string | null, ApiConfig): Promise<any>} patch - Performs a PATCH request with an optional request body.
   * @property {function(string, ApiConfig): Promise<any>} delete - Performs a DELETE request.
   */
  const api = {
    /**
     * Performs an asynchronous GET request to the specified URL.
     *
     * @param {string} url - The URL endpoint for the GET request.
     * @param {ApiConfig} [config={}] - Optional configuration for the request (e.g., headers, timeout).
     * @returns {Promise<any>} A promise that resolves with the response data from the GET request.
     * @example
     * // In a React component or custom hook:
     * const { data, error, isLoading } = useSWR('/api/users', api.get);
     * // Or directly:
     * api.get('/api/data')
     * .then(response => console.log(response))
     * .catch(error => console.error('GET error:', error));
     */
    get: useCallback(
      async (url, config = {}) => {
        return await makeApiCall("GET", url, null, config);
      },
      [makeApiCall]
    ),

    /**
     * Performs an asynchronous POST request to the specified URL with an optional body.
     *
     * @param {string} url - The URL endpoint for the POST request.
     * @param {Object | Array | string | null} [body=null] - The data to be sent in the request body.
     * @param {ApiConfig} [config={}] - Optional configuration for the request.
     * @returns {Promise<any>} A promise that resolves with the response data from the POST request.
     * @example
     * api.post('/api/users', { name: 'Alice', email: 'alice@example.com' })
     * .then(response => console.log('User created:', response))
     * .catch(error => console.error('POST error:', error));
     */
    post: useCallback(
      async (url, body = null, config = {}) => {
        return await makeApiCall("POST", url, body, config);
      },
      [makeApiCall]
    ),

    /**
     * Performs an asynchronous PUT request to the specified URL with an optional body.
     * Typically used for updating an existing resource.
     *
     * @param {string} url - The URL endpoint for the PUT request.
     * @param {Object | Array | string | null} [body=null] - The data to be sent in the request body (the complete new state of the resource).
     * @param {ApiConfig} [config={}] - Optional configuration for the request.
     * @returns {Promise<any>} A promise that resolves with the response data from the PUT request.
     * @example
     * api.put('/api/users/123', { id: 123, name: 'Alice Smith', email: 'alice.s@example.com' })
     * .then(response => console.log('User updated:', response))
     * .catch(error => console.error('PUT error:', error));
     */
    put: useCallback(
      async (url, body = null, config = {}) => {
        return await makeApiCall("PUT", url, body, config);
      },
      [makeApiCall]
    ),

    /**
     * Performs an asynchronous PATCH request to the specified URL with an optional body.
     * Typically used for partial updates to an existing resource.
     *
     * @param {string} url - The URL endpoint for the PATCH request.
     * @param {Object | Array | string | null} [body=null] - The data containing partial updates to be sent in the request body.
     * @param {ApiConfig} [config={}] - Optional configuration for the request.
     * @returns {Promise<any>} A promise that resolves with the response data from the PATCH request.
     * @example
     * api.patch('/api/users/123', { email: 'new.alice@example.com' })
     * .then(response => console.log('User email updated:', response))
     * .catch(error => console.error('PATCH error:', error));
     */
    patch: useCallback(
      async (url, body = null, config = {}) => {
        return await makeApiCall("PATCH", url, body, config);
      },
      [makeApiCall]
    ),

    /**
     * Performs an asynchronous DELETE request to the specified URL.
     *
     * @param {string} url - The URL endpoint for the DELETE request.
     * @param {ApiConfig} [config={}] - Optional configuration for the request.
     * @returns {Promise<any>} A promise that resolves with the response data (often empty or a confirmation) from the DELETE request.
     * @example
     * api.delete('/api/users/123')
     * .then(() => console.log('User deleted successfully'))
     * .catch(error => console.error('DELETE error:', error));
     */
    delete: useCallback(
      async (url, config = {}) => {
        return await makeApiCall("DELETE", url, null, config);
      },
      [makeApiCall]
    ),
  };

  const value = {
    api,
    isRefreshing,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export default ApiProvider;
