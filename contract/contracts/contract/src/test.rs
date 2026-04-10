#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_submit_news() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let headline = String::from_str(&env, "Breaking: Major discovery announced");
    let source = String::from_str(&env, "Reuters");
    let content_hash = String::from_str(&env, "abc123def456");

    let id = client.submit_news(&user, &headline, &source, &content_hash);
    assert_eq!(id, 0);

    let news = client.get_news(&0);
    assert_eq!(news.headline, headline);
    assert_eq!(news.source, source);
    assert_eq!(news.status, String::from_str(&env, "pending"));
}

#[test]
fn test_verify_news() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let verifier = Address::generate(&env);
    let headline = String::from_str(&env, "Breaking: Major discovery announced");
    let source = String::from_str(&env, "Reuters");
    let content_hash = String::from_str(&env, "abc123def456");

    client.submit_news(&user, &headline, &source, &content_hash);
    client.verify_news(&verifier, &0, &String::from_str(&env, "verified"));

    let news = client.get_news(&0);
    assert_eq!(news.status, String::from_str(&env, "verified"));
}

#[test]
fn test_reject_news() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let verifier = Address::generate(&env);
    let headline = String::from_str(&env, "Fake news story");
    let source = String::from_str(&env, "Unknown");
    let content_hash = String::from_str(&env, "fakehash");

    client.submit_news(&user, &headline, &source, &content_hash);
    client.verify_news(&verifier, &0, &String::from_str(&env, "fake"));

    let news = client.get_news(&0);
    assert_eq!(news.status, String::from_str(&env, "fake"));
}

#[test]
fn test_get_news_count() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    client.submit_news(
        &user,
        &String::from_str(&env, "News 1"),
        &String::from_str(&env, "Source 1"),
        &String::from_str(&env, "hash1"),
    );
    client.submit_news(
        &user,
        &String::from_str(&env, "News 2"),
        &String::from_str(&env, "Source 2"),
        &String::from_str(&env, "hash2"),
    );

    let count = client.get_news_count();
    assert_eq!(count, 2);
}
