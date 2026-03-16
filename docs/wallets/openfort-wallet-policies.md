<!--
Sitemap:
- [Redirecting...](/index): Openfort documentation home page. Get started with embedded wallets, global wallets, backend wallets, and blockchain infrastructure for your web and mobile.
- [Redirecting...](/docs/): Openfort developer documentation hub. Learn how to integrate embedded wallets, global wallets, backend wallets, and blockchain infrastructure into your applications.
- [Configuration](/docs/configuration/): Configure API keys, authentication providers, gas sponsorship, webhooks, and security settings for your Openfort application. Central hub for all project.
- [Welcome to Openfort](/docs/overview/): Choose the right Openfort product for your needs. Compare Embedded Wallets, Global Wallets, Backend Wallets, and Onetap to find the best wallet infrastructure.
- [Recipes](/docs/recipes/): Explore Openfort integration recipes with popular DeFi protocols and blockchain applications. Find ready-to-use sample apps for Solana, USDC, Hyperliquid, and more.
- [Entity addresses](/docs/configuration/addresses): Contract addresses for Openfort deployed smart contracts across supported networks. Find account factory, paymaster, and proxy addresses for EVM and Solana chains.
- [API keys](/docs/configuration/api-keys): Manage Openfort API keys for authentication including secret and publishable keys in test and live modes. Secure your integration with proper key management.
- [Supported blockchains](/docs/configuration/chains): Openfort supports multiple blockchain ecosystems with tiered functionality including signature abstraction, wallet management, and gas sponsorship.
- [Configure allowed domains](/docs/configuration/configure-origins): Secure your Openfort publishable key by restricting which web domains can use it in production. Configure allowed origins to prevent unauthorized key usage on.
- [Default assets](/docs/configuration/default-assets): Reference for default token assets returned by wallet_getAssets across Openfort-supported blockchains. View ERC-20 tokens and native assets configured per network.
- [Ecosystem dashboard configuration](/docs/configuration/ecosystem): Configure your Openfort ecosystem brand settings including name, logo, colors, custom domain, and legal policies. Personalize the global wallet experience for users.
- [Using a third-party auth provider](/docs/configuration/external-auth): Integrate Openfort with third-party authentication providers that support JWT-based authentication for embedded wallet creation.
- [Pay gas fees with ERC20 tokens](/docs/configuration/gas-erc20): Configure ERC-20 token gas payment for your Openfort application. Set up fee sponsorship where users pay transaction fees using ERC-20 tokens with dynamic pricing.
- [Gas sponsorship](/docs/configuration/gas-sponsorship): Set up and manage gas sponsorship policies for your Openfort application. Configure fee sponsorship rules to cover transaction costs and improve user onboarding.
- [Provider migration](/docs/configuration/migration): Migrate users between authentication providers using Openfort's built-in migration tool. Transfer user accounts and wallets seamlessly when switching auth systems.
- [Configure allowed native apps](/docs/configuration/native-apps): Secure your Openfort embedded wallets by restricting which native mobile and desktop apps can use your publishable key. Configure app-level access restrictions.
- [Events](/docs/configuration/notifications): Configure notifications to receive real-time events from your Openfort account or on-chain activity via email or webhooks.
- [Policies](/docs/configuration/policies/): Control Openfort operations with rule-based authorization policies. Define which transactions, signings, and actions your application can perform on behalf of users.
- [How billing works](/docs/configuration/project-billing): Understand Openfort's project-based billing system, credit balances, and payment options. Manage gas sponsorship costs and monitor usage across your projects.
- [Embedded wallet recovery methods](/docs/configuration/recovery-methods/): Compare Openfort wallet recovery options: automatic, password, and passkey methods. Choose the best recovery strategy for your embedded wallet application and users.
- [Social login](/docs/configuration/social-login): Configure social login providers for your Openfort application. Learn about supported OAuth providers including Google, Apple, Discord, Twitter, and more options.
- [Manage teams](/docs/configuration/team): Configure team member roles and permissions across your Openfort projects. Invite collaborators, assign admin or developer roles, and manage project-level access.
- [Updated authentication](/docs/configuration/updated-authentication): Understand the differences between v1 and v2 authentication endpoints and which version your project uses based on its creation date.
- [User Sessions](/docs/configuration/user-sessions): Manage user sessions with secure session tokens in your Openfort application. Configure token lifetimes, automatic refresh, and session persistence for embedded.
- [Ethereum wallet authentication](/docs/configuration/wallet-auth/): Configure Sign-In With Ethereum (SIWE) for EVM-compatible wallet authentication using MetaMask, Rainbow, or WalletConnect.
- [Webhooks](/docs/configuration/webhooks): Configure HTTPS webhooks to receive real-time notifications about Openfort events. Monitor transactions, account changes, and wallet operations in your application.
- [Building with AI](/docs/overview/building-with-ai): Openfort documentation is built with AI-first principles, providing llms.txt files, Markdown rendering, and MCP server access for AI assistants.
- [Why Openfort](/docs/overview/why-openfort): Learn how Openfort solves wallet infrastructure challenges like vendor lock-in, approval bottlenecks, and transaction lifecycle management.
- [Global Wallet](/docs/products/cross-app-wallet/): Learn how to integrate, customize, and deploy Openfort global wallets using the Ecosystem SDK for onboarding, authentication, and payments.
- [Embedded Wallets](/docs/products/embedded-wallet/): Build seamless wallet experiences with Openfort embedded wallets. Integrate self-custodial wallets with authentication, key management, and multi-chain.
- [Infrastructure](/docs/products/infrastructure/): Enterprise-grade Account Abstraction infrastructure including a high-performance ERC-4337 bundler and fee sponsorship paymaster for gas sponsorship on Ethereum and Solana.
- [Backend wallets](/docs/products/server/): Scale on-chain operations with developer-controlled wallets designed for automation, security, and high-throughput backend services.
- [Integrate with EIP-7702](/docs/recipes/7702): Build a Next.js app with Openfort embedded wallets using EIP-7702 authorization. Sample app demonstrating account delegation and gasless transactions with smart.
- [Yield on Aave](/docs/recipes/aave): Full-stack DeFi application demonstrating lending and borrowing operations using Openfort embedded wallets with the Aave protocol.
- [Wallet permissions](/docs/recipes/agent-permissions): Delegated transaction execution with time-limited agent permissions. A backend agent autonomously executes DCA token swaps on behalf of users using Openfort embedded wallets and Calibur smart accounts on Base Sepolia.
- [Trade on Hyperliquid](/docs/recipes/hyperliquid/): Build trading applications on Hyperliquid using Openfort backend wallets with the @nktkas/hyperliquid SDK for perpetuals, spot, and HyperEVM.
- [Swap on LI.FI](/docs/recipes/lifi): Next.js application demonstrating cross-chain swaps using Openfort's embedded wallet infrastructure paired with LiFi's routing engine.
- [Yield on Morpho](/docs/recipes/morpho): Full-stack application integrating Openfort embedded wallets with Morpho Blue USDC vault on Base for optimized yield generation.
- [Solana integration](/docs/recipes/solana): Build a Solana web application with Openfort embedded wallets. Sample app demonstrating SOL transfers, gasless transactions via Kora, and wallet management on Solana.
- [USDC transfer](/docs/recipes/usdc): Build a React Native Expo app for USDC token transfers with Openfort embedded wallets. Sample app demonstrating stablecoin payments and wallet infrastructure on Ethereum Sepolia.
- [x402 payment protocol](/docs/recipes/x402): Modular React application demonstrating HTTP-based USDC micropayments using Openfort embedded and backend wallets with gasless transactions via Coinbase's x402 payment protocol.
- [Postman API Suite](/docs/reference/postman): Import the Openfort Postman collection to test API endpoints interactively. Explore authentication, wallet, and transaction APIs with pre-configured request.
- [Self-hosted key management](/docs/configuration/advanced/self-host): Host your own embedded wallet key management infrastructure using OpenSigner for complete control over key custody, data handling, and compliance requirements.
- [Custom auth token](/docs/configuration/custom-auth/auth-token): Set up custom token-based authentication with Openfort using your own auth provider. Configure custom auth tokens and dashboard settings for embedded wallets.
- [Custom OIDC auth](/docs/configuration/custom-auth/oidc-token): Set up OIDC-compatible authentication with Openfort using providers like Auth0, Cognito, or Okta. Configure OpenID Connect tokens for embedded wallet creation.
- [AccelByte auth](/docs/configuration/external-auth/accelbyte): Authenticate users with AccelByte and create Openfort embedded wallets. Integrate AccelByte IAM as an external authentication provider for your gaming application.
- [Better-Auth](/docs/configuration/external-auth/better-auth): Authenticate users with Better-Auth and create Openfort embedded wallets. Integrate Better-Auth as an external authentication provider for your wallet application.
- [Firebase auth](/docs/configuration/external-auth/firebase): Authenticate users with Firebase and create Openfort embedded wallets. Integrate Firebase Auth as an external authentication provider for your wallet application.
- [LootLocker auth](/docs/configuration/external-auth/lootlocker): Authenticate users with LootLocker and create Openfort embedded wallets. Integrate LootLocker as an external authentication provider for your gaming application.
- [PlayFab auth](/docs/configuration/external-auth/playfab): Authenticate users with PlayFab and create Openfort embedded wallets. Integrate Microsoft PlayFab as an external authentication provider for your game application.
- [Supabase auth](/docs/configuration/external-auth/supabase): Authenticate users with Supabase and create Openfort embedded wallets. Integrate Supabase Auth as an external authentication provider for your wallet application.
- [Custom SMTP](/docs/configuration/password/custom-smtp): Configure a custom SMTP server for sending authentication emails in Openfort Auth. Use your own email provider for password resets and email verification messages.
- [Password-based auth](/docs/configuration/password/security): Configure password security settings in Openfort Auth. Enable leaked password protection, set minimum strength requirements, and enforce security best practices.
- [Ethereum policy rules](/docs/configuration/policies/ethereum-rules): Complete reference for Ethereum policy rules in Openfort. Configure EVM operation types, criteria, amount limits, and contract restrictions for authorization.
- [Policy rules reference](/docs/configuration/policies/rules-reference): Complete reference for Openfort policy structure, evaluation logic, and pre-flight testing. Understand how authorization rules are matched and executed for.
- [Solana policy rules](/docs/configuration/policies/solana-rules): Complete reference for Solana policy rules in Openfort. Configure Solana operation types, criteria, and program restrictions for fee sponsorship authorization.
- [Apple login](/docs/configuration/social-login/auth-apple): Configure Sign in with Apple for web and native iOS, macOS, and tvOS applications using Openfort Auth. Set up Apple OAuth credentials for social authentication.
- [Discord Login](/docs/configuration/social-login/auth-discord): Configure Discord OAuth login for your Openfort project. Set up a Discord application, add API credentials, and enable Discord social authentication for your users.
- [Facebook Login](/docs/configuration/social-login/auth-facebook): Configure Facebook Login for your Openfort project. Set up a Facebook application, add API credentials, and enable Facebook social authentication for your users.
- [Google login](/docs/configuration/social-login/auth-google): Configure Google Sign-In for web, Android, and Chrome extension apps with Openfort Auth. Set up OAuth credentials and enable Google social login for your users.
- [LINE Login](/docs/configuration/social-login/auth-line): Configure LINE Login for your Openfort project. Set up a LINE application, add API credentials in your dashboard, and enable LINE social authentication for users.
- [X (Twitter) Login](/docs/configuration/social-login/auth-twitter): Configure Twitter/X OAuth login for your Openfort project. Set up a Twitter application, add API credentials, and enable Twitter social authentication for users.
- [RPC methods overview](/docs/products/cross-app-wallet/rpc/): Complete reference for supported RPC methods in Openfort global wallets. Covers authentication, transactions, signing, permissions, and batch call capabilities.
- [Account Types](/docs/products/embedded-wallet/account-types): Openfort documentation for Account Types. Learn how to integrate embedded wallet features including authentication, transactions, and key management.
- [Authentication Methods](/docs/products/embedded-wallet/authentication): Overview of all supported authentication methods for Openfort embedded wallets, including response types and when to use each method.
- [Overview JavaScript](/docs/products/embedded-wallet/javascript/): Learn about the Openfort JavaScript SDK for secure authentication, embedded wallets, and powerful UX in your game or app.
- [Migrating to Openfort](/docs/products/embedded-wallet/migration/): Comprehensive guide for migrating your embedded wallet provider to Openfort. Step-by-step instructions for switching from Privy, Dynamic, Turnkey, or Web3Auth.
- [Getting Started with Openfort React Native](/docs/products/embedded-wallet/react-native/): Learn how to integrate the Openfort React Native SDK for seamless wallet and authentication experiences in your mobile app.
- [Quickstart React](/docs/products/embedded-wallet/react/): Get started with Openfort embedded wallets in React. Set up a new project using the Openfort CLI, configure authentication, and create your first embedded wallet.
- [Getting Started with Openfort Swift](/docs/products/embedded-wallet/swift/): Openfort documentation for Getting Started with Swift. Explore guides, API references, and tutorials for integrating wallet infrastructure into your applications.
- [Overview Unity (Embedded Wallet)](/docs/products/embedded-wallet/unity/): Get started with the Openfort Unity SDK for secure player authentication, embedded wallets, and seamless blockchain integration in your cross-platform Unity games.
- [Wallet Lifecycle](/docs/products/embedded-wallet/wallet-lifecycle): Openfort documentation for Wallet Lifecycle. Learn how to integrate embedded wallet features including authentication, transactions, and key management.
- [4337 Bundler](/docs/products/infrastructure/bundler/): Openfort Bundler overview for ERC-4337 account abstraction. Learn about the high-performance bundler service that processes user operations across EVM blockchains.
- [Paymaster — Fee Sponsorship for Ethereum and Solana](/docs/products/infrastructure/paymaster/): Enable fee sponsorship and gas sponsorship for your users with the Openfort Paymaster. Sponsor transaction fees across Ethereum chains and Solana for seamless, gasless experiences.
- [Backend wallet accounts](/docs/products/server/accounts): Create, list, retrieve, import, and export backend wallet accounts for Ethereum and Solana using the Openfort Node SDK.
- [API authentication](/docs/products/server/authentication): Authenticate requests to Openfort backend wallet endpoints using JWT tokens signed with your wallet secret. Secure server-to-server wallet operations with HMAC.
- [Backend wallet policies](/docs/products/server/policies): Control which signing operations your Openfort backend wallets can perform using rule-based authorization policies. Define transaction rules, limits, and.
- [Backend wallet security](/docs/products/server/security): Learn about the security architecture of Openfort's backend wallets, including TEE-based key protection, encryption, and authentication.
- [Getting started](/docs/products/server/setup): Set up Openfort backend wallets on your server. Configure SDK credentials, initialize the client, and secure your environment for server-side wallet operations.
- [Backend wallet usage](/docs/products/server/usage): Use Openfort backend wallets for server-side account management, transaction signing, and blockchain interactions. Execute operations programmatically from your.
- [Viem integration](/docs/products/server/viem-integration): Use viem types and utilities with Openfort backend wallets for type-safe Ethereum signing operations. Integrate server-side wallets with the viem library ecosystem.
- [Wallet secret rotation](/docs/products/server/wallet-secret-rotation): Rotate your Openfort backend wallet secrets to maintain security or recover from a compromise. Follow best practices for zero-downtime secret key rotation.
- [Agent wallets](/docs/recipes/hyperliquid/agent-wallets): Delegate trading to agent wallets on Hyperliquid with time-limited permissions using Openfort backend wallets. Enable automated trading with secure key management.
- [Builder codes](/docs/recipes/hyperliquid/builder-codes): Earn revenue from Hyperliquid trades using builder codes with Openfort backend wallets. Attribute trading fees and implement builder code referral programs in DeFi.
- [Client-side SDKs](/docs/recipes/hyperliquid/client-side): Integrate Hyperliquid trading in React and React Native apps using Openfort embedded wallets with wagmi. Build client-side DeFi trading interfaces for Hyperliquid.
- [HyperEVM](/docs/recipes/hyperliquid/hyperevm): Deploy contracts and send transactions on HyperEVM using Openfort backend wallets with viem for the Hyperliquid EVM chain.
- [Policies](/docs/recipes/hyperliquid/policies): Restrict Hyperliquid signing actions using Openfort's policy engine to deny withdrawals, transfers, and control agent approvals.
- [Subaccounts](/docs/recipes/hyperliquid/subaccounts): Isolate trading positions and risk using Hyperliquid vault subaccounts with Openfort backend wallets. Implement subaccount management for DeFi trading applications.
- [Executing trades](/docs/recipes/hyperliquid/trading): Place market, limit, stop-loss, and TWAP orders on Hyperliquid with leverage and margin configuration using Openfort backend wallets.
- [eth_accounts](/docs/products/cross-app-wallet/rpc/eth_accounts): Retrieve connected account addresses using the eth_accounts RPC method with Openfort global wallets. Access user wallet addresses for your decentralized application.
- [eth_requestAccounts](/docs/products/cross-app-wallet/rpc/eth_requestAccounts): Request wallet connection using the eth_requestAccounts RPC method with Openfort global wallets. Connect your application to user wallet accounts for interactions.
- [eth_sendTransaction](/docs/products/cross-app-wallet/rpc/eth_sendTransaction): Broadcast transactions using the eth_sendTransaction RPC method with Openfort global wallets. Send native transfers and contract calls through the wallet interface.
- [eth_signTypedData_v4](/docs/products/cross-app-wallet/rpc/eth_signTypedData_v4): Sign EIP-712 typed data using the eth_signTypedData_v4 RPC method with Openfort global wallets. Implement structured data signing for DeFi and smart contracts.
- [personal_sign](/docs/products/cross-app-wallet/rpc/personal_sign): Sign EIP-191 personal messages using the personal_sign RPC method with Openfort global wallets. Implement message signing for authentication and verification.
- [wallet_getCallsStatus](/docs/products/cross-app-wallet/rpc/wallet_getCallsStatus): Check the status of batched calls using the wallet_getCallsStatus RPC method with Openfort global wallets. Monitor transaction bundle execution and confirmations.
- [wallet_getCapabilities](/docs/products/cross-app-wallet/rpc/wallet_getCapabilities): Query supported wallet capabilities using the wallet_getCapabilities RPC method with Openfort global wallets. Discover features like batch calls and sponsorship.
- [wallet_grantPermissions](/docs/products/cross-app-wallet/rpc/wallet_grantPermissions): Grants permissions for an Application to perform actions on behalf of the account using the wallet_grantPermissions RPC method.
- [wallet_revokePermissions](/docs/products/cross-app-wallet/rpc/wallet_revokePermissions): Revoke wallet permissions using the wallet_revokePermissions RPC method with Openfort global wallets. Manage and control app access to wallet capabilities.
- [wallet_sendCalls](/docs/products/cross-app-wallet/rpc/wallet_sendCalls): Send batched transaction bundles using the wallet_sendCalls RPC method with Openfort global wallets. Execute multiple operations in a single user confirmation.
- [Ecosystem wallet signers](/docs/products/cross-app-wallet/setup/signers/): Choose the right key management signer for your Openfort global wallet. Compare Social Login and Passkey signer options for the Ecosystem SDK configuration.
- [Why global wallets?](/docs/products/cross-app-wallet/setup/why): Understand the benefits of Openfort global wallets over traditional embedded wallets and how the Ecosystem SDK enables seamless cross-app experiences.
- [Batch transactions](/docs/products/cross-app-wallet/usage/batch-transactions): Send multiple transactions in a single call using Openfort global wallets with EIP-5792. Batch operations for better UX and reduced user confirmations.
- [Quickstart with Sign in button](/docs/products/cross-app-wallet/usage/create-wallet-button): Add a branded wallet sign-in button to any React app using the Openfort Ecosystem SDK. Implement cross-app wallet onboarding with minimal code and configuration.
- [Sponsor transactions](/docs/products/cross-app-wallet/usage/gas-policies): Sponsor user transactions using fee policies with the Openfort Ecosystem SDK. Configure gas sponsorship for your global wallet to cover user transaction costs.
- [Integrating with wallet libraries](/docs/products/cross-app-wallet/usage/libraries/): Use wallet libraries like RainbowKit and ConnectKit with Openfort global wallets. Implement polished wallet connection UIs with pre-built components and connectors.
- [Quickstart with React Native](/docs/products/cross-app-wallet/usage/react-native): Add Openfort global wallet support to your React Native app using the Mobile Wallet Protocol Client. Enable cross-app wallet connectivity for mobile applications.
- [Signature Verification (Global Wallet)](/docs/products/cross-app-wallet/usage/signatures): Verify smart contract wallet signatures using wagmi with Openfort global wallets. Handle ERC-1271 signature validation for account abstraction wallets correctly.
- [Global wallet in Unity](/docs/products/cross-app-wallet/usage/unity): Integrate Openfort global wallet into your Unity game using the Mobile Wallet Protocol. Connect players to a shared ecosystem wallet across mobile platforms.
- [Unity Android](/docs/products/cross-app-wallet/usage/unity-android): Integrate Openfort global wallet in Unity for Android using the Mobile Wallet Protocol. Enable cross-app wallet connectivity for Android game builds.
- [Unity WebGL](/docs/products/cross-app-wallet/usage/unity-webgl): Add Openfort global wallet support to your Unity WebGL builds. Integrate cross-app wallet functionality for browser-based games using the Ecosystem SDK connector.
- [Wagmi setup for global wallets](/docs/products/cross-app-wallet/usage/web-app-wagmi): Integrate Openfort global wallet into your Wagmi-based web app using the Mobile Wallet Protocol. Connect users to the ecosystem wallet with Rapidfire ID support.
- [Embedded Wallet Authentication (JavaScript)](/docs/products/embedded-wallet/javascript/auth): Integrate third-party authentication providers like Firebase and Supabase with Openfort embedded wallets using the JavaScript SDK for secure user authentication.
- [Error Handling](/docs/products/embedded-wallet/javascript/errors): Handle errors from the Openfort JavaScript SDK with typed error classes and error codes. Implement robust error handling for authentication and wallet operations.
- [Events](/docs/products/embedded-wallet/javascript/events): Monitor authentication and wallet events with the Openfort JavaScript SDK event system. Subscribe to state changes, errors, and lifecycle events in your app.
- [Quickstart](/docs/products/embedded-wallet/javascript/quickstart): Get started quickly with the Openfort JavaScript SDK. Step-by-step guide to set up authentication, create embedded wallets, and send your first transaction.
- [Smart Wallets (JS)](/docs/products/embedded-wallet/javascript/smart-wallet/): Get started with Openfort smart wallets in JavaScript. Learn how to create, configure, and interact with smart contract wallets using the Openfort JS SDK.
- [JavaScript SDK Troubleshooting](/docs/products/embedded-wallet/javascript/troubleshooting): Troubleshoot common Openfort JavaScript SDK issues including build errors, bundler configurations, and framework-specific integration problems with solutions.
- [Using the Openfort JS SDK](/docs/products/embedded-wallet/javascript/use-openfort): Configure and initialize the Openfort JavaScript SDK for embedded wallets. Learn how to set up the SDK client and manage wallet state in your web application.
- [Understanding wallets (JS)](/docs/products/embedded-wallet/javascript/wallets): Integrate Openfort embedded wallets with popular Web3 libraries including Wagmi, Viem, and Ethers.js. Use standard wallet interfaces in your JavaScript application.
- [Migrate from Dynamic](/docs/products/embedded-wallet/migration/dynamic): Step-by-step guide to migrate from Dynamic to Openfort embedded wallets. Transfer user accounts, authentication flows, and wallet infrastructure with minimal.
- [Migrate from Privy](/docs/products/embedded-wallet/migration/privy): Step-by-step guide to migrate from Privy to Openfort embedded wallets. Transfer user accounts, authentication flows, and wallet infrastructure with minimal.
- [Migrate from Turnkey](/docs/products/embedded-wallet/migration/turnkey): Step-by-step guide to migrate from Turnkey to Openfort embedded wallets. Transfer user accounts, authentication flows, and wallet infrastructure with minimal.
- [Migrate from Web3Auth](/docs/products/embedded-wallet/migration/web3auth): Step-by-step guide to migrate from Web3Auth to Openfort embedded wallets. Transfer user accounts, authentication flows, and wallet infrastructure with minimal.
- [Authentication Methods](/docs/products/embedded-wallet/react-native/auth): Overview of supported authentication flows in Openfort React Native. Compare email, social login, guest, wallet, and third-party auth options for mobile wallets.
- [Components](/docs/products/embedded-wallet/react-native/components/): Openfort React Native UI components for authentication and state management. Use pre-built components like AuthBoundary for streamlined mobile wallet development.
- [Hooks](/docs/products/embedded-wallet/react-native/hooks/): Complete reference for Openfort React Native hooks. Browse all hooks for authentication, wallet management, and user state in your mobile embedded wallet.
- [Wallet Configuration (React Native)](/docs/products/embedded-wallet/react-native/wallet/): Configure smart wallets for React Native apps with Openfort. Set up recovery methods, wallet lifecycle management, and transaction capabilities for mobile.
- [Authentication Methods](/docs/products/embedded-wallet/react/auth/): Overview of all supported authentication flows in Openfort React. Compare email, social login, guest, wallet, and third-party auth options for embedded wallets.
- [Error handling](/docs/products/embedded-wallet/react/errors): Catch and handle SDK errors with OpenfortError and OpenfortErrorType.
- [Events](/docs/products/embedded-wallet/react/events): Monitor Openfort SDK events in React for authentication and wallet state changes. Subscribe to lifecycle events, errors, and status updates in your React.
- [Hooks](/docs/products/embedded-wallet/react/hooks/): Complete reference for Openfort React hooks. Browse all available hooks for authentication, wallet management, transaction signing, and UI control in your React app.
- [Openfort UI Customization](/docs/products/embedded-wallet/react/ui/): Customize pre-built Openfort React UI components for wallet actions and authentication flows. Use ready-made components for login, wallet management, and.
- [Wallet configuration](/docs/products/embedded-wallet/react/wallet/): Configure wallet creation, connection, and management with Openfort React hooks. Set up recovery methods, wallet types, and the complete wallet lifecycle flow.
- [Content Security Policy (CSP)](/docs/products/embedded-wallet/security/csp): Configure Content Security Policy headers for Openfort embedded wallets. Set up CSP directives to secure your web application while enabling wallet functionality.
- [On-device execution](/docs/products/embedded-wallet/security/on-device): Openfort's on-device execution environment provides secure, fast wallet operations with browser-isolated key management.
- [User authentication security](/docs/products/embedded-wallet/security/user-authentication): Learn how Openfort secures user authentication with token-based sessions, automatic refresh, and tamper detection. Understand the security model for embedded.
- [User session and authorization](/docs/products/embedded-wallet/server/access-token): Obtain and verify user session tokens for secure server-side authorization with Openfort. Validate authentication tokens and manage access control in your backend.
- [Automatic recovery session](/docs/products/embedded-wallet/server/automatic-recovery-session): Implement automatic wallet recovery sessions with Openfort's secure backend integration. Enable server-side recovery flows for embedded wallets without user.
- [Pregenerating an embedded wallet](/docs/products/embedded-wallet/server/pregenerate-wallets): Pregenerate non-custodial Openfort wallets for users before they sign up. Reserve wallet addresses server-side so they are ready when users complete authentication.
- [Unity Quickstart](/docs/products/embedded-wallet/unity/quickstart): Get started with the Openfort Unity SDK. Step-by-step guide to integrate authentication, create embedded wallets, and enable blockchain features in your game.
- [Using smart wallets (Unity)](/docs/products/embedded-wallet/unity/smart-wallet/): Interact with smart wallets in Unity games using the Openfort SDK. Access blockchain functionality with automatically created smart contract wallets for players.
- [Unity SDK Troubleshooting](/docs/products/embedded-wallet/unity/troubleshooting): Troubleshoot Openfort Unity SDK issues including platform compatibility, build errors, and runtime problems. Find solutions for common development challenges.
- [WebGL Setup (Unity)](/docs/products/embedded-wallet/unity/webgl): Configure Openfort Unity SDK for WebGL builds with iframe-based secure key management. Handle cross-origin restrictions and wallet operations in browser games.
- [Bundler Endpoints](/docs/products/infrastructure/bundler/endpoints/): API reference for Openfort Bundler endpoints. Send user operations, estimate gas, and manage ERC-4337 account abstraction bundles with the Openfort bundler service.
- [Bundler Errors](/docs/products/infrastructure/bundler/errors): Error codes and troubleshooting for the Openfort Bundler service. Diagnose and resolve common user operation failures, gas estimation errors, and submission issues.
- [Ethereum Paymaster — Gas Sponsorship](/docs/products/infrastructure/paymaster/ethereum/): Openfort EVM Paymaster overview for gas fee sponsorship. Learn how to sponsor transaction fees for users on Ethereum and EVM-compatible blockchains with policies.
- [Solana Paymaster — Fee Sponsorship on Solana](/docs/products/infrastructure/paymaster/solana/): Enable fee sponsorship on Solana with the Openfort Paymaster. Sponsor transaction fees and deliver gasless, sponsored transactions for your Solana users.
- [Send gasless transactions (EVM)](/docs/products/server/evm/gasless-transactions): Send gasless transactions with Openfort backend wallets on EVM chains. Automatic EIP-7702 delegation, transaction signing, and submission in a single call.
- [Viem integration](/docs/products/server/evm/viem-integration): Use viem types and utilities with Openfort backend wallets for type-safe Ethereum signing operations. Integrate server-side wallets with the viem library ecosystem.
- [Send gasless transactions (Solana)](/docs/products/server/solana/gasless-transactions): Send gasless transactions with Openfort backend wallets on Solana. Transfer SOL, SPL tokens, or submit raw instructions without requiring the wallet to hold SOL for fees.
- [Branding your global wallet](/docs/products/cross-app-wallet/setup/react/branding): Customize the appearance and branding of your Openfort global wallet using the Ecosystem SDK. Configure colors, logos, and themes to match your brand identity.
- [Ecosystem dashboard configuration](/docs/products/cross-app-wallet/setup/react/dashboard): Configure your Openfort global wallet branding, custom domain, and legal settings through the dashboard. Set up your ecosystem wallet's identity and appearance.
- [Build your global wallet](/docs/products/cross-app-wallet/setup/react/quickstart): Get started with the Openfort Ecosystem SDK in React. Step-by-step guide to set up and launch your own custom global wallet with authentication and transactions.
- [Wallet design and routing](/docs/products/cross-app-wallet/setup/react/wallet-ui): Design and customize your Openfort global wallet UI using the Ecosystem SDK in React. Configure routing, layouts, and components for a branded wallet experience.
- [Openfort social login signer](/docs/products/cross-app-wallet/setup/signers/openfort): Set up and use the Openfort non-custodial signer with social login for secure authentication and global wallet experiences.
- [Passkey (WebAuthn) signer](/docs/products/cross-app-wallet/setup/signers/passkey): Set up the Passkey WebAuthn signer for your Openfort global wallet. Enable secure biometric authentication with self-custodial key management in your ecosystem.
- [Integrating with ConnectKit](/docs/products/cross-app-wallet/usage/libraries/connectkit): Integrate your Openfort global wallet with ConnectKit for a polished wallet connection experience. Add ecosystem wallet support to your ConnectKit-powered dApp.
- [Integrating with RainbowKit](/docs/products/cross-app-wallet/usage/libraries/rainbowkit): Integrate your Openfort global wallet with RainbowKit for a beautiful wallet connection UI. Add ecosystem wallet support to your RainbowKit-powered application.
- [Third-party auth providers](/docs/products/embedded-wallet/javascript/auth/external-auth): Integrate Openfort embedded wallets with JWT-based auth providers like Firebase, Supabase, and Better-Auth using the JavaScript SDK for seamless authentication.
- [External Wallet Login](/docs/products/embedded-wallet/javascript/auth/external-wallet): Connect external wallets via SIWE with the Openfort JavaScript SDK. Enable Sign-In with Ethereum for users who prefer authenticating with their existing wallet.
- [Guest Users](/docs/products/embedded-wallet/javascript/auth/guest): Allow users to immediately start using your application without registration through guest accounts with embedded wallets.
- [Social Login (OAuth)](/docs/products/embedded-wallet/javascript/auth/oauth-login): Implement social login with OAuth providers using the Openfort JavaScript SDK. Add Google, Apple, Discord, and other social sign-in flows to your wallet app.
- [Email and Password](/docs/products/embedded-wallet/javascript/auth/password): Implement secure password-based authentication with the Openfort JavaScript SDK. Set up email and password sign-up and login flows for your embedded wallet app.
- [Phone Login (SMS)](/docs/products/embedded-wallet/javascript/auth/phone-login): Implement phone number authentication with SMS OTP using the Openfort JavaScript SDK. Add passwordless phone login for a seamless embedded wallet experience.
- [Export Private Key](/docs/products/embedded-wallet/javascript/signer/export-key): Export embedded wallet private keys using the Openfort JavaScript SDK. Allow users to back up their keys or import them into external wallets like MetaMask.
- [Wallet Creation and Recovery (JS)](/docs/products/embedded-wallet/javascript/signer/recovery): Configure wallet recovery methods with the Openfort JavaScript SDK. Set up automatic, password, or passkey recovery to protect user embedded wallet access.
- [Update Recovery Method](/docs/products/embedded-wallet/javascript/signer/update-recovery): Upgrade or switch recovery methods for Openfort embedded wallets using the JavaScript SDK. Migrate between password, passkey, and automatic recovery options.
- [funding](/docs/products/embedded-wallet/javascript/smart-wallet/funding): Fund your Openfort embedded wallet using the JavaScript SDK. Learn how to integrate on-ramp solutions to simplify adding funds to smart wallet accounts.
- [Handling chains (JS)](/docs/products/embedded-wallet/javascript/smart-wallet/handling-networks): Handle network switching and chain management with Openfort smart wallets in JavaScript. Learn how to configure multi-chain support for embedded wallets.
- [Integrating with Wallet Libraries (JS)](/docs/products/embedded-wallet/javascript/smart-wallet/libraries): Integrate Openfort JavaScript SDK with popular Web3 libraries like Wagmi, Viem, and Ethers.js. Connect embedded wallets to your preferred development tools.
- [Using Smart Wallets (JavaScript)](/docs/products/embedded-wallet/javascript/smart-wallet/send): Send transactions with Openfort smart wallets in JavaScript. Learn how to execute transfers, contract calls, and sponsored transactions with code examples.
- [Using Your Own Authentication](/docs/products/embedded-wallet/react-native/auth/third-party): Integrate Openfort React Native with external auth providers like Firebase, Supabase, and Auth0. Connect your existing auth system to mobile embedded wallets.
- [AuthBoundary](/docs/products/embedded-wallet/react-native/components/auth-boundary): Use the Openfort AuthBoundary component to declaratively render content based on user authentication state in React Native. Simplify auth-aware UI rendering in.
- [useEmailAuth](/docs/products/embedded-wallet/react-native/hooks/useEmailAuth): Openfort React Native hook for email and password authentication. Implement secure sign-up and login flows with useEmailAuth in your mobile wallet app.
- [useEmailAuthOtp](/docs/products/embedded-wallet/react-native/hooks/useEmailAuthOtp): Openfort React Native hook for OTP-based email authentication and passwordless login. Implement seamless email verification with useEmailAuthOtp in mobile.
- [useEmbeddedEthereumWallet](/docs/products/embedded-wallet/react-native/hooks/useEmbeddedEthereumWallet): Openfort React Native hook for managing embedded Ethereum wallets with a state machine interface. Build EVM wallet features in your mobile application.
- [useEmbeddedSolanaWallet](/docs/products/embedded-wallet/react-native/hooks/useEmbeddedSolanaWallet): Openfort React Native hook for managing embedded Solana wallets with a state machine interface. Build Solana wallet features in your mobile application.
- [useGuestAuth](/docs/products/embedded-wallet/react-native/hooks/useGuestAuth): Openfort React Native hook for creating guest accounts with instant onboarding. Use useGuestAuth to let mobile users try your app without registration.
- [useOAuth](/docs/products/embedded-wallet/react-native/hooks/useOAuth): Openfort React Native hook for OAuth authentication with social providers like Google and Apple. Add social login to your mobile embedded wallet app.
- [useOpenfort](/docs/products/embedded-wallet/react-native/hooks/useOpenfort): Openfort React Native hook for accessing SDK initialization state and errors. Use useOpenfort to manage the Openfort client lifecycle in your mobile app.
- [useOpenfortClient](/docs/products/embedded-wallet/react-native/hooks/useOpenfortClient): Openfort React Native hook for accessing the underlying Openfort client for advanced operations. Use useOpenfortClient for low-level SDK interactions.
- [usePasskeyPrfSupport](/docs/products/embedded-wallet/react-native/hooks/usePasskeyPrfSupport): Check if the device supports passkey-based wallet recovery with the PRF extension (Android 14+, iOS 18+).
- [usePhoneAuthOtp](/docs/products/embedded-wallet/react-native/hooks/usePhoneAuthOtp): Openfort React Native hook for OTP-based phone authentication and passwordless login. Add SMS verification with usePhoneAuthOtp to your mobile wallet app.
- [useSignOut](/docs/products/embedded-wallet/react-native/hooks/useSignOut): Openfort React Native hook for signing out users and clearing authentication state. Use useSignOut to manage session cleanup in your mobile wallet app.
- [useUser](/docs/products/embedded-wallet/react-native/hooks/useUser): Openfort React Native hook for accessing the authenticated user and account information. Use useUser to display user profiles and manage state in mobile apps.
- [useWalletAuth](/docs/products/embedded-wallet/react-native/hooks/useWalletAuth): Openfort React Native hook for wallet authentication using SIWE (Sign-In with Ethereum). Enable Web3-native login with useWalletAuth in your mobile app.
- [Quickstart — Automatic recovery (React Native)](/docs/products/embedded-wallet/react-native/quickstart/automatic): Build a complete Openfort React Native app with automatic wallet recovery. Step-by-step tutorial for seamless authentication and embedded wallets on mobile devices.
- [Quickstart — Passkey recovery (React Native)](/docs/products/embedded-wallet/react-native/quickstart/passkey): Build a complete Openfort React Native app with passkey wallet recovery. Step-by-step tutorial for authentication and biometric-secured embedded wallets on mobile.
- [Quickstart — Password recovery (React Native)](/docs/products/embedded-wallet/react-native/quickstart/password): Build a complete Openfort React Native app with password wallet recovery. Step-by-step tutorial for authentication and password-secured embedded wallets on mobile.
- [Wallet actions](/docs/products/embedded-wallet/react-native/wallet/actions): Execute embedded wallet transactions and configure gas sponsorship in React Native apps with Openfort. Send transactions and sign messages on mobile platforms.
- [Get a wallet](/docs/products/embedded-wallet/react-native/wallet/active-wallet): Manage and switch the active wallet using Openfort's embedded wallet hooks in React Native. Handle multiple wallet accounts on mobile and control the active one.
- [Manage wallets](/docs/products/embedded-wallet/react-native/wallet/connect): Guide users through wallet creation and connection with Openfort React Native hooks. Implement the complete mobile wallet setup flow with recovery method selection.
- [Using Your Own Authentication](/docs/products/embedded-wallet/react/auth/third-party): Integrate Openfort React with external auth providers like Firebase, Supabase, and Auth0. Connect your existing authentication system to Openfort embedded wallets.
- [use7702Authorization](/docs/products/embedded-wallet/react/hooks/use7702Authorization): Openfort React hook for signing EIP-7702 authorizations for smart account features. Enable account abstraction with use7702Authorization in your app.
- [useAuthCallback](/docs/products/embedded-wallet/react/hooks/useAuthCallback): Openfort React hook for handling OAuth and email verification callback redirects. Use useAuthCallback to complete the authentication flow securely.
- [useConnectWithSiwe](/docs/products/embedded-wallet/react/hooks/useConnectWithSiwe): Openfort React hook for connecting and authenticating with SIWE after wallet connection. Use useConnectWithSiwe for seamless Web3 authentication flows.
- [useEmailAuth](/docs/products/embedded-wallet/react/hooks/useEmailAuth): Openfort React hook for email and password authentication flows. Implement secure sign-up and login with useEmailAuth in your embedded wallet app.
- [useEmailOtpAuth](/docs/products/embedded-wallet/react/hooks/useEmailOtpAuth): Openfort React hook for email OTP one-time password authentication. Implement passwordless email login with useEmailOtpAuth for a seamless experience.
- [useEthereumEmbeddedWallet](/docs/products/embedded-wallet/react/hooks/useEthereumEmbeddedWallet): Ethereum embedded wallet — address, chainId, provider, isConnected, plus create, list, setActive, export key. Your useAccount + useWalletClient + wallet management in one hook.
- [useEthereumWalletAssets](/docs/products/embedded-wallet/react/hooks/useEthereumWalletAssets): Openfort React hook for fetching wallet token balances across supported chains. Learn how to use useWalletAssets to display ERC-20 and native assets.
- [useGrantPermissions](/docs/products/embedded-wallet/react/hooks/useGrantPermissions): Openfort React hook for granting session key permissions using EIP-7715. Use useGrantPermissions to enable scoped, popupless wallet interactions.
- [useGuestAuth](/docs/products/embedded-wallet/react/hooks/useGuestAuth): Openfort React hook for creating guest accounts with instant onboarding. Use useGuestAuth to let users try your app without upfront authentication.
- [useOAuth](/docs/products/embedded-wallet/react/hooks/useOAuth): Openfort React hook for OAuth authentication with social providers like Google, Apple, and Discord. Integrate social login with useOAuth in your app.
- [useOpenfort](/docs/products/embedded-wallet/react/hooks/useOpenfort): Openfort React hook for accessing the core SDK context and client instance. Use useOpenfort to initialize and interact with Openfort in your React app.
- [usePhoneOtpAuth](/docs/products/embedded-wallet/react/hooks/usePhoneOtpAuth): Openfort React hook for phone OTP authentication via SMS. Implement passwordless phone login with usePhoneOtpAuth in your embedded wallet application.
- [useRevokePermissions](/docs/products/embedded-wallet/react/hooks/useRevokePermissions): Openfort React hook for revoking session key permissions. Use useRevokePermissions to manage and revoke EIP-7715 session keys in your application.
- [useSignOut](/docs/products/embedded-wallet/react/hooks/useSignOut): Openfort React hook for signing out users and clearing authentication state. Use useSignOut to securely end user sessions in your embedded wallet app.
- [useSolanaEmbeddedWallet](/docs/products/embedded-wallet/react/hooks/useSolanaEmbeddedWallet): Solana embedded wallet create, list, setActive, export key.
- [useUI](/docs/products/embedded-wallet/react/hooks/useUI): Openfort React hook for controlling the wallet modal programmatically. Use useUI to open, close, and manage the Openfort modal UI in your application.
- [useUser](/docs/products/embedded-wallet/react/hooks/useUser): Openfort React hook for accessing the current authenticated user and account details. Use useUser to display user profiles and manage account state.
- [useWalletAuth](/docs/products/embedded-wallet/react/hooks/useWalletAuth): Openfort React hook for wallet authentication using SIWE (Sign-In with Ethereum). Enable Web3-native login with useWalletAuth for embedded wallets.
- [Quickstart — Passkey recovery (React)](/docs/products/embedded-wallet/react/quickstart/passkey): Build the Openfort React quickstart with passkey wallet recovery. Follow this tutorial to set up authentication and biometric-secured embedded wallets step by step.
- [Quickstart — Password recovery (React)](/docs/products/embedded-wallet/react/quickstart/password): Build the Openfort React quickstart with password wallet recovery. Follow this tutorial to set up authentication and password-secured embedded wallets step by step.
- [Openfort UI Configuration](/docs/products/embedded-wallet/react/ui/configuration): Configure Openfort React UI components for your application. Set up authentication providers, wallet options, and styling parameters for the pre-built UI elements.
- [Customization](/docs/products/embedded-wallet/react/ui/customization): Customize the look and feel of Openfort React UI components to match your brand. Configure themes, colors, typography, and styling for authentication and wallet UIs.
- [Wallet actions](/docs/products/embedded-wallet/react/wallet/actions): Send transactions, sign messages, and switch chains with Openfort embedded wallets in React. Complete guide to wallet actions including gas sponsorship.
- [Active wallet](/docs/products/embedded-wallet/react/wallet/active-wallet): View, list, and switch the active wallet with useEthereumEmbeddedWallet and useSolanaEmbeddedWallet.
- [Wallet asset inventory](/docs/products/embedded-wallet/react/wallet/assets): Query and display wallet assets including native tokens and ERC-20 tokens for Ethereum embedded wallets. For Solana, use the embedded wallet provider for balance.
- [Creating a new embedded wallet](/docs/products/embedded-wallet/react/wallet/create): Guide users through wallet creation and management with Openfort React hooks and UI components. Create embedded wallets with useEthereumEmbeddedWallet and useSolanaEmbeddedWallet hooks.
- [Disconnect Wallet](/docs/products/embedded-wallet/react/wallet/disconnect): Disconnect wallets from your React app with Openfort. Implement secure session cleanup, state reset, and smooth UI transitions when users disconnect their wallets.
- [Wallet actions](/docs/products/embedded-wallet/react/wallet/provider): Use the Openfort wallet provider directly in React for ERC-20 transfers and gas sponsorship. Access low-level wallet functionality through the provider interface.
- [Email And Password (iOS)](/docs/products/embedded-wallet/swift/auth/email): Implement email and password authentication in your iOS app using the Openfort Swift SDK. Enable secure sign-up and login flows with the OFSDK email auth methods.
- [External Wallet Authentication (iOS)](/docs/products/embedded-wallet/swift/auth/external-wallet): Connect external wallets in your iOS app using the Openfort Swift SDK. Enable users to authenticate via existing Ethereum wallets with SIWE integration.
- [Guest Mode (iOS)](/docs/products/embedded-wallet/swift/auth/guest): Implement guest authentication in your iOS app using the Openfort Swift SDK. Let users start without registration and upgrade their accounts later seamlessly.
- [Logout users (iOS)](/docs/products/embedded-wallet/swift/auth/logout): Implement user logout functionality in your iOS app using the Openfort Swift SDK. Securely clear sessions and authentication tokens with the OFSDK logout method.
- [Login with OAuth provider (iOS)](/docs/products/embedded-wallet/swift/auth/oauth): Implement OAuth social login in your iOS app using the Openfort Swift SDK. Support Google, Apple, Discord, and other OAuth providers for seamless authentication.
- [Reset Password (iOS)](/docs/products/embedded-wallet/swift/auth/reset-password): Implement password reset flows in your iOS app using the Openfort Swift SDK. Guide users through secure email-based password recovery with OFSDK methods.
- [Native Sign in with Apple (iOS)](/docs/products/embedded-wallet/swift/auth/sign-in-with-apple): Integrate native Sign in with Apple in your iOS app using the Openfort Swift SDK. Leverage Apple's authentication for seamless embedded wallet onboarding.
- [Third-party authentication (iOS)](/docs/products/embedded-wallet/swift/auth/third-party): Integrate third-party authentication providers in your iOS app using the Openfort Swift SDK. Connect Firebase, Supabase, or custom JWT providers with Openfort.
- [User Session (iOS)](/docs/products/embedded-wallet/swift/auth/user-session): Manage user sessions in your iOS app using the Openfort Swift SDK. Handle login state, session persistence, and automatic token refresh for embedded wallets.
- [Getting the EIP-1193 provider (iOS)](/docs/products/embedded-wallet/swift/wallet/ethereum-provider): Get the EIP-1193 Ethereum provider in your iOS app using the Openfort Swift SDK. Connect embedded wallets to Web3 libraries with a standard provider interface.
- [Export private key (iOS)](/docs/products/embedded-wallet/swift/wallet/export-key): Export embedded wallet private keys in your iOS app using the Openfort Swift SDK. Allow users to back up or migrate their keys to external wallet clients.
- [Create embedded wallets (iOS)](/docs/products/embedded-wallet/swift/wallet/recovery): Configure wallet recovery methods in your iOS app using the Openfort Swift SDK. Set up password, passkey, or automatic recovery for smart wallet key management.
- [Send a transaction (iOS)](/docs/products/embedded-wallet/swift/wallet/send): Send blockchain transactions in your iOS app using the Openfort Swift SDK. Execute native transfers and contract calls with embedded wallets and gas sponsorship.
- [Sign message (iOS)](/docs/products/embedded-wallet/swift/wallet/sign-message): Sign personal messages in your iOS app using the Openfort Swift SDK. Implement EIP-191 message signing for authentication and verification in embedded wallets.
- [Sign a transaction (iOS)](/docs/products/embedded-wallet/swift/wallet/sign-transaction): Sign transactions in your iOS app using the Openfort Swift SDK. Prepare and sign blockchain transactions for embedded wallets before broadcasting them.
- [Sign Typed Data (iOS)](/docs/products/embedded-wallet/swift/wallet/sign-typed): Sign EIP-712 typed data in your iOS app using the Openfort Swift SDK. Implement structured data signing for DeFi interactions and smart contract approvals.
- [Embedded Wallet State (iOS)](/docs/products/embedded-wallet/swift/wallet/state): Check embedded wallet state in your iOS app using the Openfort Swift SDK. Monitor wallet initialization, readiness, and recovery status with state management APIs.
- [Switch chains (iOS)](/docs/products/embedded-wallet/swift/wallet/switch-chains): Switch blockchain networks in your iOS app using the Openfort Swift SDK. Learn how to change chains dynamically for embedded wallet multi-chain support.
- [Email and Password (Unity)](/docs/products/embedded-wallet/unity/auth/email): Implement traditional email and password authentication for Unity games. For passwordless authentication, see Email OTP & SMS OTP.
- [External Wallet Authentication (Unity)](/docs/products/embedded-wallet/unity/auth/external-wallet): Connect external wallets via SIWE in Unity games using the Openfort SDK. Support players who prefer authenticating with their existing Ethereum wallet clients.
- [Guest Mode (Unity)](/docs/products/embedded-wallet/unity/auth/guest): Implement guest authentication in Unity games using the Openfort SDK. Allow players to start instantly and upgrade their guest accounts later with full wallets.
- [Email OTP & SMS OTP (Unity)](/docs/products/embedded-wallet/unity/auth/otp): Implement passwordless OTP authentication via email or SMS in Unity games using the Openfort SDK. Enable quick, secure login without passwords for players.
- [Third-party authentication (Unity)](/docs/products/embedded-wallet/unity/auth/third-party): Integrate JWT-based auth providers like Firebase, Supabase, and Better-Auth in Unity games using the Openfort SDK for secure player authentication flows.
- [User Session Management (Unity)](/docs/products/embedded-wallet/unity/auth/user-sessions): Manage player sessions in Unity games with the Openfort SDK. Handle token management, session persistence, automatic refresh, and secure logout for players.
- [Setup game ads to sponsor gas fees](/docs/products/embedded-wallet/unity/resources/ads-unity): Integrate Unity LevelPlay ads with Openfort to sponsor gas fees in your Unity game. Reward players with gasless transactions funded by advertisement revenue.
- [Integrate Android In-App Purchases (IAP) in Unity](/docs/products/embedded-wallet/unity/resources/android-iap-unity): Integrate Android In-App Purchasing with Openfort in Unity games. Enable players to purchase crypto assets and NFTs through the Google Play billing system.
- [Mobile In-App Purchases (IAP) in Unity](/docs/products/embedded-wallet/unity/resources/apple-iap-unity): Build a compliant crypto In-App Purchasing system for Unity mobile games with Apple and Google. Integrate Openfort wallets with native store billing flows.
- [Add reCAPTCHA in your Unity game](/docs/products/embedded-wallet/unity/resources/captcha-unity): Integrate Google reCAPTCHA V3 with Openfort in Unity games. Protect your game from bots, spam, and fraudulent blockchain transactions with captcha verification.
- [Create and recover wallets in Unity](/docs/products/embedded-wallet/unity/signer/recovery): Set up wallet recovery methods in Unity games using the Openfort SDK. Configure automatic, password, or passkey recovery options for player embedded wallets.
- [Sign messages (Unity)](/docs/products/embedded-wallet/unity/signer/sign-messages): Implement message signing in Unity games using the Openfort SDK. Allow players to sign personal messages and typed data with their embedded wallet securely.
- [Manage embedded wallet state (Unity)](/docs/products/embedded-wallet/unity/signer/state): Configure and manage Openfort embedded wallet states in Unity. Monitor wallet initialization, recovery status, and readiness with the Unity SDK state machine.
- [Using Smart Wallet (Unity)](/docs/products/embedded-wallet/unity/smart-wallet/send): Send blockchain transactions in Unity games using Openfort smart wallets. Execute transfers, contract interactions, and gas-sponsored transactions for players.
- [Paymaster Endpoints](/docs/products/infrastructure/paymaster/ethereum/endpoints): API reference for Openfort EVM Paymaster endpoints. Sponsor gas fees, estimate costs, and configure fee policies for Ethereum and EVM-compatible chain transactions.
- [Paymaster Errors](/docs/products/infrastructure/paymaster/ethereum/errors): Error codes and troubleshooting for the Openfort EVM Paymaster. Diagnose gas sponsorship failures, policy errors, and validation issues on Ethereum and EVM chains.
- [Solana Paymaster endpoints](/docs/products/infrastructure/paymaster/solana/endpoints): API reference for Openfort Solana Paymaster methods including transaction signing, fee estimation, and configuration. Sponsor Solana transaction fees for your users.
- [Solana fee sponsorship errors](/docs/products/infrastructure/paymaster/solana/errors): Error codes and troubleshooting for Openfort Solana Paymaster. Diagnose fee sponsorship failures, policy validation errors, and infrastructure issues on Solana.
- [Linking & unlinking accounts](/docs/products/embedded-wallet/javascript/auth/user-management/linking): Link and unlink user identities with the Openfort JavaScript SDK. Manage multiple auth methods including social accounts, wallets, and email for embedded wallets.
- [Session Keys (JavaScript)](/docs/products/embedded-wallet/javascript/smart-wallet/advanced/session-keys): Implement session keys for secure, scoped, and popupless transactions with Openfort smart wallets in JavaScript. Enable gasless background transactions.
- [Relay.link integration](/docs/products/embedded-wallet/javascript/smart-wallet/guides/bridge): Bridge tokens across chains in your app using the Openfort JavaScript SDK and Relay.link. Enable seamless cross-chain asset transfers for embedded wallets.
- [Export a wallet](/docs/products/embedded-wallet/react-native/wallet/actions/export-key): Export embedded wallet private keys in React Native with Openfort. Allow mobile users to back up their wallet keys or import them into external wallet clients.
- [Sign message (Solana)](/docs/products/embedded-wallet/react-native/wallet/actions/sign-message-solana): Sign Solana messages with Openfort embedded wallets in React Native. Implement Solana message signing for authentication and verification in your mobile application.
- [Sign EIP-7702 authorization](/docs/products/embedded-wallet/react/wallet/actions/eip-7702-authorization): Sign EIP-7702 authorization to enable smart account features on Delegated Accounts with Openfort embedded wallets in React.
- [Export a wallet](/docs/products/embedded-wallet/react/wallet/actions/export-key): Export embedded wallet private keys in React with Openfort. Allow users to back up their wallet keys or import them into external wallet clients like MetaMask.
- [Session Keys (React)](/docs/products/embedded-wallet/react/wallet/actions/session-keys): Learn how to use session keys for secure, scoped, and popupless transactions in Openfort smart wallets using React hooks.
- [Sign message](/docs/products/embedded-wallet/react/wallet/actions/sign-message): Sign personal messages and EIP-712 typed data with Openfort embedded wallets in React. Implement message signing for authentication, approvals, and verifications.
- [Sign message (Solana)](/docs/products/embedded-wallet/react/wallet/actions/sign-message-solana): Sign Solana messages with Openfort embedded wallets in React. Implement Solana message signing for authentication and verification in your decentralized application.
- [Switch chain](/docs/products/embedded-wallet/react/wallet/actions/switch-chain): Switch blockchain networks with Openfort embedded wallets in React. Change the active chain for smart and delegated accounts dynamically in your application.
- [Integrate Firebase with Openfort in Unity](/docs/products/embedded-wallet/unity/resources/backend/firebase-extension): Set up Firebase backend integration with Openfort in Unity games. Use the Google Play Games plugin with Firebase Cloud Functions for player wallet management.
- [Integrate PlayFab in Unity](/docs/products/embedded-wallet/unity/resources/backend/playfab): Set up Microsoft PlayFab backend integration with Openfort in Unity games. Use Azure Functions to connect PlayFab player accounts with embedded wallets.
- [Integrate Unity Gaming Services (UGS) in Unity](/docs/products/embedded-wallet/unity/resources/backend/unity-gaming-services): Integrate Openfort with Unity Gaming Services for a complete live game backend. Connect player authentication, wallets, and game services in your Unity project.
- [Session Keys (Unity)](/docs/products/embedded-wallet/unity/smart-wallet/advanced/session-keys): Use session keys for secure, scoped, and popupless transactions in Unity games with Openfort smart wallets. Enable seamless background blockchain operations.
- [Send transaction (Ethereum)](/docs/products/embedded-wallet/react-native/wallet/actions/send-transaction/ethereum): Send Ethereum transactions with Openfort embedded wallets in React Native. Execute ERC-20 transfers and contract calls with optional gas sponsorship on mobile.
- [Send transaction (Solana)](/docs/products/embedded-wallet/react-native/wallet/actions/send-transaction/solana): Send Solana transactions with Openfort embedded wallets in React Native. Execute SOL transfers and program interactions with optional fee sponsorship on mobile.
- [Send transaction (Ethereum)](/docs/products/embedded-wallet/react/wallet/actions/send-transaction/ethereum): Send Ethereum transactions with Openfort embedded wallets in React. Execute native transfers, ERC-20 sends, and contract calls with optional gas sponsorship support.
- [Send transaction (Solana)](/docs/products/embedded-wallet/react/wallet/actions/send-transaction/solana): Send Solana transactions with Openfort embedded wallets in React. Execute SOL transfers and program interactions with optional fee sponsorship in your application.
-->

# Policies

Policies are **rule-based authorization controls** that govern which operations Openfort can perform on your behalf.
Each policy contains one or more rules that evaluate incoming requests against criteria you define — such as value limits, address allowlists, network restrictions, or calldata constraints.

**Common use cases:**

* **Transaction filtering** — block transfers to malicious or restricted addresses
* **Address allowlisting** — only permit transactions to known, trusted destinations
* **Value caps** — enforce per-transaction limits on native and token transfers
* **Contract call restrictions** — limit which smart contract functions can be called
* **Message signing controls** — prevent signing of arbitrary or fraudulent messages

## How policies work

When a request is received, the policy engine evaluates it:

1. **Policies are ordered by priority** — higher priority policies are evaluated first
2. **Rules within a policy use AND logic** — all criteria in a rule must match for it to apply
3. **First match wins** — the first rule that matches determines the outcome (`accept` or `reject`)
4. **Fail-closed** — if no rule matches, the operation is **rejected**

```text
Signing request
  │
  ├── Policy A (priority: 100)
  │     ├── Rule 1: accept if value ≤ 1 ETH AND address in allowlist → ✅ Match → Accept
  │     └── Rule 2: reject if value > 1 ETH                          → (skipped)
  │
  ├── Policy B (priority: 50)
  │     └── Rule 1: ...                                               → (skipped)
  │
  └── No match → ❌ Reject (fail-closed)
```

### Scopes

| Scope | Applies to | Use case |
| :--- | :--- | :--- |
| `project` | All backend wallets in the project, or all fee sponsorship requests | Organization-wide limits and allowlists |
| `account` | A specific backend wallet | Per-wallet restrictions for sensitive accounts |
| `transaction` | A specific fee sponsorship request (requires explicit `policyId`) | Strict per-request sponsorship control |

:::info
The `transaction` scope is used exclusively for [fee sponsorship policies](/docs/configuration/gas-sponsorship). When a `policyId` is passed to the paymaster, validation is strict — if the rules don't match, the transaction is rejected. Project-scoped fee sponsorship policies are auto-discovered and use soft validation.
:::

:::warning
Once you create your first policy, **all signing operations that don't match any rule will be rejected**. Start with permissive policies and tighten them over time.
:::

## Create your first policy

::::steps

### Prerequisites

Make sure you have the Node.js SDK installed and configured. See the [quickstart](/docs/products/server/setup) for setup instructions.

### Create a project-scoped policy

Create a policy that rejects high-value transactions across all backend wallets.

:::code-group

```ts [Ethereum]
import Openfort from '@openfort/openfort-node'

const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY!, {
  walletSecret: process.env.OPENFORT_WALLET_SECRET,
})

const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Reject transactions above 1 ETH',
  rules: [
    {
      action: 'reject',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'ethValue',
          operator: '>',
          ethValue: '1000000000000000000', // 1 ETH in wei
        },
      ],
    },
  ],
})

console.log('Policy created:', policy.id)
```

```ts [Solana]
import Openfort from '@openfort/openfort-node'

const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY!, {
  walletSecret: process.env.OPENFORT_WALLET_SECRET,
})

const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Reject SOL transfers above 10 SOL',
  rules: [
    {
      action: 'reject',
      operation: 'signSolTransaction',
      criteria: [
        {
          type: 'solValue',
          operator: '>=',
          value: '10000000000', // 10 SOL in lamports
        },
      ],
    },
  ],
})

console.log('Policy created:', policy.id)
```

:::

### Verify with pre-flight evaluation

Test your policy before making real signing requests using `openfort.policies.evaluate()`.

```ts
const result = await openfort.policies.evaluate({
  operation: 'signEvmTransaction',
  payload: {
    chainId: 1,
    to: '0x000000000000000000000000000000000000dEaD',
    value: '2000000000000000000', // 2 ETH — should be rejected
  },
})

console.log('Allowed:', result.allowed)             // false
console.log('Reason:', result.reason)               // "Rejected by policy rule"
console.log('Policy:', result.matchedPolicyId)      // "ply_..."
console.log('Rule:', result.matchedRuleId)          // "plr_..."
```

::::

## Common patterns

### Address allowlist

Only allow transactions to a set of known addresses on specific networks. Using `operator: 'in'` treats the list as an **allowlist** — any address not in the list is rejected.

```ts
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Only allow transfers to treasury and vault',
  rules: [
    {
      action: 'accept',
      operation: 'sendEvmTransaction',
      criteria: [
        {
          type: 'evmAddress',
          operator: 'in',
          addresses: [
            '0x000000000000000000000000000000000000dEaD', // Treasury
            '0x1234567890abcdef1234567890abcdef12345678', // Vault
          ],
        },
        {
          type: 'evmNetwork',
          operator: 'in',
          chainIds: [1, 137, 8453], // Ethereum, Polygon, Base
        },
      ],
    },
  ],
})
```

### Address denylist

Block transactions to known malicious addresses while allowing everything else. Using `operator: 'not in'` treats the list as a **denylist**.

```ts
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Block transfers to known bad addresses',
  rules: [
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'evmAddress',
          operator: 'not in',
          addresses: [
            '0xBadAddress0000000000000000000000000000001',
            '0xBadAddress0000000000000000000000000000002',
          ],
        },
      ],
    },
  ],
})
```

### Multi-rule ordering strategies

When a policy has multiple rules, their **order matters** because evaluation stops at the first match. This lets you build layered authorization — for example, allowing small transactions to any address but requiring larger transactions to go to approved addresses.

```ts
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Tiered value limits with address restrictions',
  rules: [
    // Rule 1: Accept any transaction under 1 ETH
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'ethValue',
          operator: '<=',
          ethValue: '1000000000000000000', // 1 ETH
        },
      ],
    },
    // Rule 2: Accept transactions up to 10 ETH, but only to allowlisted addresses
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'ethValue',
          operator: '<=',
          ethValue: '10000000000000000000', // 10 ETH
        },
        {
          type: 'evmAddress',
          operator: 'in',
          addresses: ['0x000000000000000000000000000000000000dEaD'],
        },
      ],
    },
    // Anything above 10 ETH or to non-allowlisted addresses → no match → rejected
  ],
})
```

**How this evaluates:**

* A 0.5 ETH transaction to any address → matches Rule 1 → **accepted**
* A 5 ETH transaction to `0x...dEaD` → fails Rule 1 (over 1 ETH), matches Rule 2 → **accepted**
* A 5 ETH transaction to an unknown address → fails Rule 1, fails Rule 2 (not allowlisted) → **rejected**
* A 15 ETH transaction to `0x...dEaD` → fails both rules → **rejected**

### Restrict to specific contract calls

Only allow ERC-20 `transfer` calls by matching the transaction calldata against an ABI.

```ts
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Only allow ERC-20 transfer calls',
  rules: [
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'evmData',
          operator: '==',
          abi: JSON.stringify([
            {
              type: 'function',
              name: 'transfer',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ type: 'bool' }],
            },
          ]),
          functionName: 'transfer',
        },
      ],
    },
  ],
})
```

### Disable arbitrary hash signing

Reject all raw hash signing to prevent fraud. Since `signEvmHash` has no criteria, the rule matches all hash signing attempts unconditionally.

```ts
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Block all raw hash signing',
  rules: [
    {
      action: 'reject',
      operation: 'signEvmHash',
    },
  ],
})
```

### SPL token restrictions (Solana)

Combine mint address, value, and recipient criteria to restrict SPL token transfers.

:::code-group

```ts [USDC only]
// Only allow USDC transfers under 1000 USDC to approved recipients
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Restrict USDC transfers',
  rules: [
    {
      action: 'accept',
      operation: 'signSolTransaction',
      criteria: [
        {
          type: 'mintAddress',
          operator: '==',
          addresses: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'], // USDC
        },
        {
          type: 'splValue',
          operator: '<=',
          value: '1000000000', // 1000 USDC (6 decimals)
        },
        {
          type: 'splAddress',
          operator: 'in',
          addresses: ['DtdSSG8ZJRZVv5Jx7K1MeWp7Zxcu19GD5wQRGRpQ9uMF'],
        },
      ],
    },
  ],
})
```

```ts [SOL + USDC]
// Allow native SOL transfers and USDC transfers with separate limits
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'SOL and USDC transfer limits',
  rules: [
    // Rule 1: SOL transfers under 10 SOL
    {
      action: 'accept',
      operation: 'sendSolTransaction',
      criteria: [
        {
          type: 'solValue',
          operator: '<=',
          value: '10000000000', // 10 SOL
        },
      ],
    },
    // Rule 2: USDC transfers under 10,000 USDC
    {
      action: 'accept',
      operation: 'sendSolTransaction',
      criteria: [
        {
          type: 'mintAddress',
          operator: '==',
          addresses: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
        },
        {
          type: 'splValue',
          operator: '<=',
          value: '10000000000', // 10,000 USDC (6 decimals)
        },
      ],
    },
  ],
})
```

:::

### Account-scoped policy

Apply restrictions to a specific backend wallet rather than the entire project.

```ts
// Create a backend wallet
const account = await openfort.accounts.evm.backend.create()

// Create an account-scoped policy
const policy = await openfort.policies.create({
  scope: 'account',
  accountId: account.id,
  description: 'Account-level restrictions for this wallet',
  priority: 10,
  rules: [
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'evmAddress',
          operator: 'in',
          addresses: ['0x000000000000000000000000000000000000dEaD'],
        },
        {
          type: 'ethValue',
          operator: '<=',
          ethValue: '500000000000000000', // 0.5 ETH
        },
      ],
    },
    {
      action: 'accept',
      operation: 'signEvmMessage',
      criteria: [
        {
          type: 'evmMessage',
          operator: 'match',
          pattern: '^Sign in to',
        },
      ],
    },
  ],
})
```

### Multi-rule cross-chain policy

A single policy can contain rules for both Ethereum and Solana operations.

```ts
const policy = await openfort.policies.create({
  scope: 'project',
  description: 'Cross-chain policy with Ethereum and Solana rules',
  priority: 100,
  rules: [
    // Ethereum: accept transactions under 1 ETH to known addresses
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        { type: 'ethValue', operator: '<=', ethValue: '1000000000000000000' },
        {
          type: 'evmAddress',
          operator: 'in',
          addresses: ['0x000000000000000000000000000000000000dEaD'],
        },
      ],
    },
    // Solana: accept SOL transfers under 5 SOL
    {
      action: 'accept',
      operation: 'signSolTransaction',
      criteria: [
        { type: 'solValue', operator: '<=', value: '5000000000' },
        {
          type: 'solAddress',
          operator: 'in',
          addresses: ['DtdSSG8ZJRZVv5Jx7K1MeWp7Zxcu19GD5wQRGRpQ9uMF'],
        },
      ],
    },
    // Reject all raw hash signing
    {
      action: 'reject',
      operation: 'signEvmHash',
    },
  ],
})
```

:::tip\[Runnable examples]
See the complete runnable examples for [EVM policies](https://github.com/openfort-xyz/openfort-node/tree/main/examples/evm/policies) and [Solana policies](https://github.com/openfort-xyz/openfort-node/tree/main/examples/solana/policies) in the Node SDK repository.
:::

## Managing policies

### List policies

```ts
// List all policies
const result = await openfort.policies.list({ limit: 10 })

console.log(`Found ${result.total} policies:`)
for (const policy of result.data) {
  console.log(`  ${policy.id} — ${policy.description}`)
}

// Filter by scope
const projectPolicies = await openfort.policies.list({ scope: ['project'] })
const accountPolicies = await openfort.policies.list({ scope: ['account'] })
```

### Update a policy

Updating a policy replaces all existing rules with the new set.

```ts
import type { UpdatePolicyBody } from '@openfort/openfort-node'

const updateBody: UpdatePolicyBody = {
  description: 'Lowered threshold to 0.5 ETH',
  rules: [
    {
      action: 'reject',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'ethValue',
          operator: '>',
          ethValue: '500000000000000000', // 0.5 ETH
        },
      ],
    },
  ],
}

const updated = await openfort.policies.update('ply_...', updateBody)
console.log('Updated:', updated.id)
```

### Delete a policy

```ts
const result = await openfort.policies.delete('ply_...')
console.log('Deleted:', result.deleted) // true
```

### Disable a policy

You can temporarily disable a policy without deleting it.

```ts
const disabled = await openfort.policies.update('ply_...', {
  enabled: false,
})
```

## Client-side validation

The SDK exports Zod schemas for client-side validation. Catch invalid payloads before they reach the API.

```ts
import {
  CreatePolicyBodySchema,
  UpdatePolicyBodySchema,
} from '@openfort/openfort-node'

try {
  CreatePolicyBodySchema.parse(policyBody)
} catch (error) {
  console.error('Invalid policy:', error.issues)
}
```

## Next steps

<HoverCardLayout>
  <HoverCardLink title="Rules reference" description="Complete reference for all operations, criteria types, operators, and pre-flight evaluation." href="/configuration/policies/rules-reference" icon={BookOpen} />

  <HoverCardLink title="Security" description="Learn about TEE-based signing, authentication, and wallet secret management." href="/products/server/security" icon={ShieldCheck} />
</HoverCardLayout>
