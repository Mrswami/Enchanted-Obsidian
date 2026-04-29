use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::env;
use serde_json::json;

#[derive(Serialize, Deserialize, Debug)]
pub struct AiResponse {
    pub message: String,
    pub actions: Vec<AiAction>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", content = "payload")]
pub enum AiAction {
    CreateNote { title: String, content: String },
    SearchNotes { query: String },
    ReadNote { path: String },
}

pub struct AiManager {
    client: Client,
    gemini_key: Option<String>,
    azure_key: Option<String>,
    azure_endpoint: Option<String>,
}

impl AiManager {
    /// Creates a new AiManager, loading credentials from the environment.
    pub fn new(gemini_override: Option<String>) -> Result<Self, String> {
        dotenvy::dotenv().ok();
        
        let gemini_key = gemini_override.or_else(|| env::var("GEMINI_API_KEY").ok());
        let azure_key = env::var("AZURE_AI_KEY").ok();
        let azure_endpoint = env::var("AZURE_AI_ENDPOINT").ok();

        if gemini_key.is_none() && azure_key.is_none() {
            return Err("No AI credentials found (Gemini or Azure). Check your .env file.".to_string());
        }

        Ok(Self {
            client: Client::new(),
            gemini_key,
            azure_key,
            azure_endpoint,
        })
    }

    pub async fn ask(&self, user_query: &str, system_context: &str) -> Result<AiResponse, String> {
        self.generate(json!({
            "contents": [{
                "parts": [{
                    "text": format!("{}{}\n\nUser Query: {}", SYSTEM_PROMPT, system_context, user_query)
                }]
            }],
            "generationConfig": { "response_mime_type": "application/json" }
        })).await
    }

    pub async fn process_image(&self, base64_image: &str) -> Result<String, String> {
        // Prioritize Azure if configured
        if let (Some(key), Some(endpoint)) = (&self.azure_key, &self.azure_endpoint) {
            match self.azure_ocr(base64_image, key, endpoint).await {
                Ok(text) => return Ok(text),
                Err(e) => {
                    log::error!("Azure OCR failed, falling back to Gemini: {}", e);
                }
            }
        }

        // Fallback to Gemini
        let prompt = "
You are the OCR Eye of 'EnchantedObsidian'. 
Transcribe all handwriting and text in this image precisely.
If you recognize concepts that likely link to other notes, wrap them in [[Wikilinks]].
Output ONLY the clean Markdown transcription.
";

        let body = json!({
            "contents": [{
                "parts": [
                    { "text": prompt },
                    { 
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }]
        });

        let res_json = self.post_to_gemini(body).await?;
        let text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| format!("Invalid OCR response: {:?}", res_json))?;

        Ok(text.to_string())
    }

    async fn azure_ocr(&self, base64_image: &str, key: &str, endpoint: &str) -> Result<String, String> {
        use base64::{Engine as _, engine::general_purpose};
        
        let image_data = general_purpose::STANDARD
            .decode(base64_image)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        // Format endpoint to ensure it has the correct API path
        let base_url = endpoint.trim_end_matches('/');
        let url = format!("{}/computervision/imageanalysis:analyze?api-version=2023-02-01-preview&features=read", base_url);

        let response = self.client.post(&url)
            .header("Ocp-Apim-Subscription-Key", key)
            .header("Content-Type", "application/octet-stream")
            .body(image_data)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            let err_text = response.text().await.unwrap_or_default();
            return Err(format!("Azure API Error ({}): {}", url, err_text));
        }

        let res_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        
        // Extract text from Azure Vision 4.0 response
        let mut full_text = String::new();
        if let Some(read_result) = res_json["readResult"].as_object() {
            if let Some(blocks) = read_result["blocks"].as_array() {
                for block in blocks {
                    if let Some(lines) = block["lines"].as_array() {
                        for line in lines {
                            if let Some(text) = line["text"].as_str() {
                                full_text.push_str(text);
                                full_text.push('\n');
                            }
                        }
                    }
                }
            }
        }

        if full_text.is_empty() {
            return Err("Azure OCR returned no text".to_string());
        }

        Ok(full_text)
    }

    async fn post_to_gemini(&self, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let key = self.gemini_key.as_ref().ok_or("Gemini API key not configured")?;
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}",
            key
        );

        let response = self.client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        response.json().await.map_err(|e| e.to_string())
    }

    async fn generate(&self, body: serde_json::Value) -> Result<AiResponse, String> {
        let res_json = self.post_to_gemini(body).await?;
        
        let text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| format!("Invalid AI response: {:?}", res_json))?;

        let ai_res: AiResponse = serde_json::from_str(text)
            .map_err(|e| format!("Failed to parse AI response JSON: {}. Text: {}", e, text))?;

        Ok(ai_res)
    }
}

const SYSTEM_PROMPT: &str = "
You are the Brain of 'EnchantedObsidian', a tactical markdown editor.
Your goal is to help the user manage their notes through text commands.
You have access to the following tools via JSON response:
1. CreateNote { title, content }
2. SearchNotes { query }
3. ReadNote { path }

When the user gives the command /manifest or /save, your priority mission is to synthesize the current discussion into a high-fidelity markdown note and execute the CreateNote action.
Response Format:
{
  \"message\": \"Your conversational response here\",
  \"actions\": [ { \"type\": \"CreateNote\", \"payload\": { \"title\": \"...\", \"content\": \"...\" } } ]
}
Always return valid JSON. If no action is needed, send an empty actions array.
Current System Context:
";
