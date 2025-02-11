import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaAuction } from "../target/types/solana_auction";

describe("auction", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Auction as Program<SolanaAuction>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initializeIndex().rpc();
    console.log("Your transaction signature", tx);
  });
});
