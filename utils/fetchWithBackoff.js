// lib/_utils/fetchWithBackoff.js

export async function fetchWithBackoff(url, options, retries = 5, delay = 1000) {
    let attempts = 0;
    while (attempts < retries) {
        // Log every attempt to track the flow
       
        try {
            const response = await fetch(url, options);

            // Check for 429 Too Many Requests status specifically
            if (response.status === 429) { 
                
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential increase for next retry
                attempts++;
                continue; // Skip to the next iteration (retry)
            } 
            
            // If response is not OK (e.g., 400, 500, etc.) but not 429
            if (!response.ok) {
                // Read the response body as text to check for specific messages
                const errorBody = await response.text(); 
                

                // Check if the error body contains the rate limit message, even if status is not 429
                if (errorBody.includes('Too many requests') || errorBody.includes('network rate limit is exceeded')) {
                    
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2; // Exponential increase
                    attempts++;
                    continue; // Skip to the next iteration (retry)
                }

                // For other non-retryable errors (e.g., 400 Bad Request, 404 Not Found),
                // we return the response so the calling function can handle it specifically.
                return response; 
            }

            // If the response is OK, log success and return it
            
            return response; 

        } catch (error) { // This block catches actual network errors (e.g., DNS issues, connection refused)
           
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential increase
            attempts++;
        }
    }
    // If execution reaches here, all retry attempts have been exhausted
    throw new Error(`Failed to fetch ${url} after ${retries} attempts due to network, rate limit, or unexpected API response.`);
}
