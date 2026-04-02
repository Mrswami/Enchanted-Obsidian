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
    api_key: String,
}

impl AiManager {
    pub fn new() -> Result<Self, String> {
        dotenvy::dotenv().ok();
        let api_key = env::var("GEMINI_API_KEY")
            .map_err(|_| "GEMINI_API_KEY not found in .env".to_string())?;
        
        Ok(Self {
            client: Client::new(),
            api_key,
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

    async fn post_to_gemini(&self, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}",
            self.api_key
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

When the user asks to create a note, search for something, or read a note, include the relevant action in your response.
Response Format:
{
  \"message\": \"Your conversational response here\",
  \"actions\": [ { \"type\": \"CreateNote\", \"payload\": { \"title\": \"...\", \"content\": \"...\" } } ]
}
Always return valid JSON. If no action is needed, send an empty actions array.
Current System Context:
";
