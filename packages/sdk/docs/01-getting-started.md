# Getting Started

Welcome to the SmythOS SDK! This guide will walk you through creating your very first AI agent. We'll build an agent that can fetch real-time cryptocurrency prices from an API.

The code in this guide is a more detailed version of the script found in [`examples/01-agent-code-skill/01-prompting.ts`](../../examples/01-agent-code-skill/01-prompting.ts).

## 1. Installation

First, you need to install the SmythOS SDK. Since this is a `pnpm` workspace, we'll use that. Open your terminal and run:

```bash
pnpm install @smythos/sdk
```

The SDK is designed for a frictionless start. It automatically initializes the Smyth Runtime Environment (SRE) with in-memory components, so you can start building agents right away without any complex setup.

## 2. Your First Agent

Now, let's write the code. Create a file named `index.ts` and add the following:

```typescript
import { Agent } from '@smythos/sdk';

async function main() {
    // First, we define the agent's core identity.
    // The 'name' is for your reference, 'behavior' gives the LLM its persona and instructions,
    // and 'model' specifies which language model to use.
    const agent = new Agent({
        name: 'CryptoMarket Assistant',
        behavior: 'You are a crypto price tracker. You are given a coin id and you need to get the price of the coin in USD.',
        model: 'gpt-4o',
    });

    // Next, we give the agent a new "skill".
    // Skills are tools the agent can decide to use to answer a prompt.
    // The 'name' and 'description' help the agent's underlying LLM understand what the skill does.
    agent.addSkill({
        name: 'MarketData',
        description: 'Use this skill to get comprehensive market data and statistics for a cryptocurrency',
        // The 'process' function is the actual code that runs when the skill is called.
        // It receives arguments extracted from the user's prompt.
        process: async ({ coin_id }) => {
            const url = `https://api.coingecko.com/api/v3/coins/${coin_id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
            const response = await fetch(url);
            const data = await response.json();
            // The skill returns the relevant data, which the agent will use to form a natural language response.
            return data.market_data;
        },
    });

    // Now, let's interact with the agent.
    // We send a prompt that requires the new skill. The agent's LLM will analyze the prompt,
    // identify that it needs market data, and call the 'MarketData' skill with the correct parameters ('bitcoin' and 'ethereum').
    console.log('Asking the agent for crypto prices...');
    const promptResult = await agent.prompt('What are the current prices of Bitcoin and Ethereum ?');

    // The agent synthesizes the data returned by the skill into a user-friendly, natural language response.
    console.log('Agent Response:', promptResult);

    // You are not limited to letting the agent decide. You can also call a skill directly
    // if you know exactly what you want to do. This is faster and more deterministic.
    console.log('\nCalling the skill directly for Bitcoin...');
    const directCallResult = await agent.call('MarketData', { coin_id: 'bitcoin' });
    console.log('Direct Call Result (USD):', directCallResult.current_price.usd);
}

main();
```

## 3. Run Your Code

Save the file and run it from your terminal:

```bash
ts-node index.ts
```

You'll see the agent think for a moment and then respond with the prices it fetched using the `MarketData` skill!

## Next Steps

Congratulations on building your first agent! You've learned how to:

-   Create an agent with a specific behavior.
-   Add a custom skill that calls an external API.
-   Interact with the agent using a natural language prompt.
-   Call a skill directly for more precise control.

Now you're ready to dive deeper. Move on to [Building Agents](02-agents.md) to learn how to organize multiple skills, manage agent state, and more.
