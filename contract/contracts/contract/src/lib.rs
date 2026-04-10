#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct News {
    pub headline: String,
    pub source: String,
    pub content_hash: String,
    pub status: String,
    pub submitter: Address,
    pub verifier: Option<Address>,
}

#[contracttype]
pub enum DataKey {
    News(u32),
    NewsCount,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn submit_news(
        env: Env,
        user: Address,
        headline: String,
        source: String,
        content_hash: String,
    ) -> u32 {
        user.require_auth();
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NewsCount)
            .unwrap_or(0);
        let status = String::from_str(&env, "pending");
        let news = News {
            headline,
            source,
            content_hash,
            status,
            submitter: user,
            verifier: None,
        };
        env.storage().instance().set(&DataKey::News(count), &news);
        env.storage()
            .instance()
            .set(&DataKey::NewsCount, &(count + 1));
        count
    }

    pub fn verify_news(env: Env, verifier: Address, news_id: u32, status: String) {
        verifier.require_auth();
        let mut news: News = env
            .storage()
            .instance()
            .get(&DataKey::News(news_id))
            .unwrap();
        news.status = status;
        news.verifier = Some(verifier);
        env.storage().instance().set(&DataKey::News(news_id), &news);
    }

    pub fn get_news(env: Env, news_id: u32) -> News {
        env.storage()
            .instance()
            .get(&DataKey::News(news_id))
            .unwrap()
    }

    pub fn get_news_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NewsCount)
            .unwrap_or(0)
    }
}

mod test;
