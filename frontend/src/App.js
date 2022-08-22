import { useEffect, useState, useRef } from "react";
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
    Program,
    AnchorProvider,
    web3,
    utils,
    BN,
} from "@project-serum/anchor";
import { Buffer } from "buffer";
import "./App.css";

window.Buffer = Buffer;
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
    preflightCommitment: "processed",
};
const { SystemProgram } = web3;

const App = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [campaigns, setCampaigns] = useState([]);

    const formEl = useRef(null);

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new AnchorProvider(
            connection,
            window.solana,
            opts.preflightCommitment
        );
        return provider;
    };

    const isWalletConnected = async () => {
        try {
            const { solana } = window;
            if (solana) {
                if (solana.isPhantom) {
                    const response = await solana.connect({
                        onlyIfTrusted: true,
                    });
                    console.log(
                        `Connected with public key: ${response.publicKey}`
                    );
                    setWalletAddress(response.publicKey.toString());
                } else {
                    alert("Get Phantom wallet please");
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const connectWallet = async () => {
        const { solana } = window;
        if (solana) {
            const response = await solana.connect();
            setWalletAddress(response.publicKey);
        }
    };

    const getCampaigns = async () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = getProvider();
        const program = new Program(idl, programID, provider);
        Promise.all(
            (await connection.getProgramAccounts(programID)).map(
                async (campaign) => ({
                    ...(await program.account.campaign.fetch(campaign.pubkey)),
                    pubkey: campaign.pubkey,
                })
            )
        ).then((campaigns) => setCampaigns(campaigns));
    };

    const createCampaign = async (event) => {
        event.preventDefault();
        const [name, description] = formEl.current.elements;
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            const [campaign] = await PublicKey.findProgramAddress(
                [
                    utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
                    provider.wallet.publicKey.toBuffer(),
                ],
                program.programId
            );
            await program.rpc.create(name.value, description.value, {
                accounts: {
                    campaign,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
            });
            console.log(`Created a new campaign with address: ${campaign}`);
        } catch (error) {
            console.warn(error);
        }
    };

    const donate = async (publickey) => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            await program.rpc.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
                accounts: {
                    campaign: publickey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
            });
            console.log(`Donated some money to: ${publickey}`);
            getCampaigns();
        } catch (error) {
            console.error(error);
        }
    };

    const withdraw = async (publickey) => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            await program.rpc.withdraw(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
                accounts: {
                    campaign: publickey,
                    user: provider.wallet.publicKey,
                },
            });
            console.log(`withdrew some money from: ${publickey}`);
        } catch (error) {
            console.warn(error);
        }
    };

    const RenderNotConnected = () => {
        return (
            <button className="button connect" onClick={connectWallet}>
                Connect to wallet
            </button>
        );
    };
    const RenderConnected = () => {
        return (
            <>
                <form
                    ref={formEl}
                    className="flex form"
                    onSubmit={createCampaign}
                >
                    <h1>New Campaing</h1>
                    <label htmlFor="name">Name</label>
                    <input
                        id="name"
                        name="campaing[name]"
                        className="input"
                        type="text"
                        placeholder="Name of campaing"
                    />
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="campaign[description]"
                        className="input"
                        placeholder="Description of campaing"
                    ></textarea>
                    <button className="button" type="submit">
                        Create campaign
                    </button>
                </form>
                <button
                    className="button"
                    style={{ width: "50%" }}
                    onClick={getCampaigns}
                >
                    Fetch campaigns
                </button>
                {campaigns.length > 0 && <h1>Campaigns</h1>}
                <div className="campaings-wall">
                    {campaigns.map((campaign) => (
                        <div className="card" key={campaign.pubkey.toString()}>
                            <div>
                                <p>
                                    <strong>ID:</strong>{" "}
                                    {`${campaign.pubkey
                                        .toString()
                                        .substring(0, 3)}...${campaign.pubkey
                                        .toString()
                                        .substring(
                                            40,
                                            campaign.pubkey.toString().length
                                        )}`}
                                </p>
                                <p>
                                    <strong>Balance: </strong>
                                    {campaign.amountDonated /
                                        web3.LAMPORTS_PER_SOL}
                                </p>
                                <p>
                                    <strong>Name:</strong>
                                    {campaign.name}
                                </p>
                                <p>
                                    <strong>Description:</strong>
                                    {campaign.description}
                                </p>
                                <div className="flex">
                                    <button
                                        className="button"
                                        onClick={() => donate(campaign.pubkey)}
                                    >
                                        Donate 0.2 SOL
                                    </button>
                                    <button
                                        className="button"
                                        onClick={() =>
                                            withdraw(campaign.pubkey)
                                        }
                                    >
                                        withdraw
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    useEffect(() => {
        const onLoad = async () => {
            await isWalletConnected();
        };
        onLoad();
    }, []);

    return (
        <div className="App">
            {walletAddress ? <RenderConnected /> : <RenderNotConnected />}
        </div>
    );
};

export default App;
