build:
    anchor build && pnpm build

idl: build
    cp ./target/idl/aipool_auction.json ./client/idl/ && cp ./target/types/aipool_auction.ts ./client/idl/