use reqwest::Client;

#[derive(Clone)]
pub struct HttpClient(pub Client);

impl HttpClient {
    pub fn new() -> Result<Self, reqwest::Error> {
        let client = Client::builder().build()?;
        Ok(Self(client))
    }

    pub fn inner(&self) -> &Client {
        &self.0
    }
}
