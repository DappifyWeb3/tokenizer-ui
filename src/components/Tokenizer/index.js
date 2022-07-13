import React, { useMemo, useState, useContext, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import PropTypes from 'prop-types';
import { IconButton, Grid, Button, Alert, Tabs, Tab, Typography, Box } from '@mui/material';
import { ethers } from 'ethers';
import { DappifyContext, constants, utils, contracts as artifacts, Transaction, UserProfile, Property, Logger } from 'react-dappify';
import LogoutIcon from '@mui/icons-material/Logout';
import { MinterContext } from 'components';
import Dropzone from 'components/Dropzone';
import Properties from 'components/Properties';
import ExtendedAttributes from 'components/ExtendedAttributes';
import MetadataAttributes from 'components/MetadataAttributes';
import WalletsDialog from 'components/WalletsDialog';
import Collections from 'components/Collections';
import NFTList from 'components/NFTList';
import Logo from 'components/Logo';
import Editor from 'components/Editor';


const { formatAddress } = utils.format;

const { ERC721DappifyV1, ERC1155DappifyV1 } = artifacts;
const { setPreference, getProviderPreference } = utils.localStorage;

function TabPanel(props) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            <Typography>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }
  
  TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
  };
  
  function a11yProps(index) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }


const minterProps = {
    lazy: false,
    royalties: 0,
    chainId: '',
    amount: 1,
    type: 'ERC721',
    metadata: {
        name: '',
        description: '',
        image: '',
        attributes: [],
        background_color: 'ffffff',
        animation_url: '',
        youtube_url: ''
    },
    additionalFields: [],
    metadataAttributes: [],
    collection: '',
    collectionMetadata: {
        name: '',
        description: '',
        symbol: '',
        shortUrl: '',
        image: ''
    }
};

const Tokenizer = ({ t,  onMint }) => {
    const { Provider, isAuthenticated, logout, user, configuration, isRightNetwork } = useContext(DappifyContext);
    const [minter, setMinter] = useState(minterProps);
    const [uploadedFile, setUploadedFile] = useState("");
    const [value, setValue] = useState(0);
    const [items, setItems] = useState([]);
    const [minting, setMinting] = useState({ data: null, loading: false, warning: null, error: null });
    const [jsonWarning, setJsonWarning] = useState("");
    const [showWalletDialog, setShowWalletDialog] = useState(false);
    const [options, setOptions] = useState([]);
    const defaultChainId = options.find((opt) => opt.key === 'chainId' )?.value || configuration?.chainId;
    const [background, setBackground] = useState();
    const [loading, setLoading] = useState(false);

    const context = useMemo(
        () => ({ minter, setMinter }), 
        [minter]
      );

    useEffect(() => {
        if (defaultChainId) {
            const newMinter = {...minter};
            newMinter.chainId = defaultChainId;
            setMinter(newMinter);
            setPreference(constants.PREFERENCES.CHAIN, { chainId: newMinter.chainId });
        }
    }, [defaultChainId]);

    const loadProperties = async () => {
        const props = await Property.findAllWithType({ type: 'option' });
        setOptions(props);
        const layoutProps = await Property.findAllWithType({ type: 'layout' });
        const backgroundProp = layoutProps.find((prop) => prop.key === 'background');
        setBackground(backgroundProp?.value);
    }

    const loadUserCollections = async () => {
        const context = await UserProfile.getCurrentUserContext();
        const { currentProfile } = context;
        const txs = await Transaction.listByProject({
            projectId: configuration.appId,
            page:0,
            limit:100,
            filters: [
                { 
                    key: 'category',
                    value: 'Collection' 
                },
                { 
                    key: 'status',
                    value: 'Created' 
                },
                { 
                    key: 'from',
                    value: currentProfile.source
                }
            ]
        });
        console.log(txs);
        setItems(txs);
    };

    useEffect(() => {
        if (isAuthenticated && user)
            loadUserCollections();
        loadProperties();
    }, [configuration.appId, user]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const handleAuth = async () => {
        setShowWalletDialog(true);
    }

    const checkIfNecessaryFieldsForMintingFilled = () => {

        let nothingMissed = true;

        let properImage = minter.metadata.image && uploadedFile instanceof File;
        let properAudio = minter.metadata.youtube_url //&& minter.metadata.youtube_url instanceof File;
        let properVideo = minter.metadata.animation_url //&& minter.metadata.animation_url instanceof File;

        let missingData = [];

        if (!minter.metadata.name) {
            missingData.push("Name");
            nothingMissed = false;
        }
        if (!minter.metadata.description) {
            missingData.push("Description");
            nothingMissed = false;
        }
        if (!properImage && !properAudio && !properVideo) {
            missingData.push("Image, Audio or Video File");
            nothingMissed = false;
        }

        if (nothingMissed){
            // setContinueMinting(true);
            return true;
        } else {
            setMinting({
                data: null,
                loading: false,
                warning: missingData,
                error: null
            });
            return false;
        }
    }


    const handleSubmit = async (continueMinting) => {

        // await Provider.switchNetwork(minter.chainId);

        if (continueMinting){
            let tokenId;
            let contractAddress;
            setLoading(true);
            const pref = getProviderPreference();
            const web3Provider = await Provider.enableWeb3(pref);
            // await switchToChain(constants.NETWORKS[minter.chainId], web3Provider.provider);
            setMinting({ data: null, loading: true, warning: null, error: null })

            try {
                // Append metadata extra fields
                minter.additionalFields.forEach((field) => minter.metadata[[field.key]] = field.value);

                // Append attributes
                minter.metadata.attributes = minter.metadataAttributes;

                let properImage = minter.metadata.image && uploadedFile instanceof File;
                let properAudio = minter.metadata.youtube_url && minter.metadata.youtube_url instanceof File;
                let properVideo = minter.metadata.animation_url && minter.metadata.animation_url instanceof File;
                
                // Append image file
                if (properImage) {
                    Logger.debug('Uploading image file');
                    const imageFile = new Provider.File('image', uploadedFile);
                    await imageFile.saveIPFS();
                    const imageFileUrl = imageFile.ipfs();
                    minter.metadata.image = imageFileUrl;
                }
                // Append audio file
                if (properAudio) {
                    Logger.debug('Uploading video file');
                    const videoFile = new Provider.File('youtube_url', minter.metadata.youtube_url);
                    await videoFile.saveIPFS();
                    const videoFileUrl = videoFile.ipfs();
                    minter.metadata.youtube_url = videoFileUrl;
                }
                // Append video file
                if (properVideo) {
                    Logger.debug('Uploading audio file');
                    const audioFile = new Provider.File('animation_url', minter.metadata.animation_url);
                    await audioFile.saveIPFS();
                    const audioFileUrl = audioFile.ipfs();
                    minter.metadata.animation_url = audioFileUrl;
                }

                // Generate metadata and save to IPFS
                const metadataFile = new Provider.File('metadata.json', {
                base64: Buffer.from(JSON.stringify(minter.metadata)).toString("base64"),
                });
                await metadataFile.saveIPFS();
                const metadataFileUrl = metadataFile.ipfs();
                
                let response, hash, status, contract, transaction;

                if (!minter.lazy) {
                    // Mint from blockchain
                    const signer = web3Provider.getSigner();
                    const userAddress = user.get('ethAddress');
                    contractAddress = minter.collection[minter.type];
                    const royaltyValue = minter.royalties*100;
                    if (minter.type === 'ERC721') {
                        contract = new ethers.Contract(contractAddress, ERC721DappifyV1.abi, signer);
                        transaction = await contract.mint(userAddress, userAddress, royaltyValue, metadataFileUrl);
                        Logger.debug(`Minting ERC721 contract: ${contractAddress}, owner: ${userAddress}, recipient:${userAddress}, royalties: ${royaltyValue}, metadata: ${metadataFileUrl}`);
                    } else if (minter.type === 'ERC1155') {
                        contract = new ethers.Contract(contractAddress, ERC1155DappifyV1.abi, signer);
                        transaction = await contract.mint(userAddress, userAddress, royaltyValue, metadataFileUrl, minter.amount);
                        Logger.debug(`Minting ERC721 contract: ${contractAddress}, owner: ${userAddress}, recipient:${userAddress}, royalties: ${royaltyValue}, metadata: ${metadataFileUrl}, amount: ${minter.amount}`);
                    } else {
                        throw new Error('Unsupported type');
                    }

                    const tx = await transaction.wait();
                    console.log(tx.events[0]);
                    tokenId = tx.events[0].topics[3];
                    hash = tx.transactionHash;
                    status = 'Minted';
                    response = `${constants.NETWORKS[minter.chainId].blockExplorerUrls[0]}/tx/${hash}`;
                } else {
                    // Lazy mint
                    status = 'LazyMinted';
                }
                
                await new Transaction({
                    // Creating new
                    transactionHash: hash,
                    contract: contractAddress,
                    uri: metadataFileUrl,
                    tokenId: tokenId,
                    metadata: minter.metadata,
                    status: status,
                    symbol: minter.collectionMetadata.symbol,
                    name: minter.metadata.name,
                    chainId: minter.chainId,
                    event: minter,
                    category: 'NFT',
                    type: minter.type,
                    quantity: parseInt(minter.amount)
                }).save();
        
                setMinting({
                    data: response,
                    loading: false,
                    warning: null,
                    error: null
                });
            } catch (err) {
                console.error(err);
                setMinting({
                    data: null,
                    loading: false,
                    warning: null,
                    error: err.message
                });
            } finally {
                setLoading(false);
            }
        }
    }

    const getInitialDropzoneFiles = () => {
        const list = [];
        if (minter.metadata.image) list.push(uploadedFile);
        if (minter.metadata.animation_url) list.push(minter.metadata.animation_url);
        if (minter.metadata.youtube_url) list.push(minter.metadata.youtube_url);
        return list;
    }

    const handleTokenImageChange = (files) => {
        let upload;
        files.forEach((file) => {
            const newMinter = {...minter};
            if (file.type.startsWith('image')) {
                newMinter.metadata.image = file.name;
                upload = 'Image uploaded.';
                setUploadedFile(file);
            } else if (file.type.startsWith('audio')) {
                newMinter.metadata.animation_url = file;
                upload = 'Audio uploaded.';
            } else if (file.type.startsWith('video')) {
                newMinter.metadata.youtube_url = file;
                upload = 'Video uploaded.';
            } else {
                console.log('Not supported');
            }
            setMinter(newMinter);
        });
        if (files){
            upload += ' Please do not modify the respective field inside the json metadata.'
            setJsonWarning(upload)
            }
        }


    const authContent = (

        <Grid container alignItems="center" justifyContent="center" px={{ xs:2, md: '18%' }}>
            <WalletsDialog isOpen={showWalletDialog} onClose={() => setShowWalletDialog(false)} t={t} />
            <Grid container spacing={2} alignItems="center" justifyContent="center" sx={{ margin: '0 auto' }}>
                <Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={value} onChange={handleChange} aria-label="options">
                    <Tab label={t('My NFT')} {...a11yProps(0)} />
                    <Tab label={t('Advanced (Optional)')} {...a11yProps(1)} />
                    <Tab label={t('Metadata Source')} {...a11yProps(2)} />
                    {/* isAuthenticated && (<Tab label="My NFTs" {...a11yProps(3)} />) */}
                  </Tabs>
                </Box>
                <TabPanel value={value} index={0}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Dropzone initialFiles={getInitialDropzoneFiles()} handleChange={handleTokenImageChange} t={t} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Properties defaultChainId={defaultChainId} handleAuth={handleAuth} t={t} />
                        </Grid>
                        {/*<Grid item xs={12}>
                            <FormGroup>
                                <FormControlLabel control={<Checkbox defaultChecked={minter.lazy} onChange={(e) => {
                                    const newMinter = {...minter};
                                    newMinter.lazy = e.target.checked;
                                    setMinter(newMinter);
                                }} />} label="I want to lazy mint" />
                            </FormGroup>
                            </Grid> */}

                            <Collections hidden={true} defaultChainId={defaultChainId} handleAuth={handleAuth} collections={items} t={t} onClose={() => {
                                loadUserCollections();
                            }} />

                            {/* Add a warning before minting to let users know primary attributes are not set (title, description, image) */}

                            {minting.warning && (
                                <Grid item xs={12}>
                                    <Alert
                                        severity="warning"
                                        action={
                                            <Button
                                                color="inherit"
                                                size="large"
                                                onClick={() => {
                                                    // setContinueMinting(true);
                                                    handleSubmit(true);}
                                                    }
                                            >
                                                Continue Anyway
                                            </Button>}>
                                        The following properties are missing 
                                        <ul>
                                            {minting.warning.map((el)=><li>{el}</li>)}
                                        </ul>
                                    </Alert>
                                </Grid>
                            )}

                            {minting.error && (
                                <Grid item xs={12}>
                                    <Alert sx={{ wordBreak: 'break-word' }} severity="error">{minting.error}</Alert>
                                </Grid>
                            )}
                            {minting.data && (
                                <Grid item xs={12}>
                                    {!minter.lazy && (<Alert severity="success">{t('Your minting was successful')} <a href={minting.data} target="_blank" rel="noreferrer">{t('View your transaction')}</a></Alert>)}
                                    {minter.lazy && (<Alert severity="success">{t('Your token has been minted')}</Alert>)}
                                </Grid>
                            )}
                            {!isAuthenticated && (
                                <Grid item xs={12}>
                                    <Button id="connect-wallet-tokenizer-btn" variant="contained" size="large" fullWidth  onClick={handleAuth}>{t('Connect your wallet to get started!')}</Button>
                                </Grid>
                            )}
                            {isAuthenticated && (
                                <Grid item xs={12}>
                                    <Button id="mint-tokenizer-btn" disabled={loading} variant="contained" size="large" fullWidth
                                        onClick={() => {
                                            let continueMinting = checkIfNecessaryFieldsForMintingFilled();
                                            handleSubmit(continueMinting);
                                        }}>
                                        { !loading ? 
                                            t('Create your NFT') :
                                            t('Please confirm the transaction from your wallet and wait...')
                                        }
                                    </Button>
                                </Grid>
                            )}
                    </Grid>
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <ExtendedAttributes t={t}/>
                    <MetadataAttributes t={t}/>
                    <Collections defaultChainId={defaultChainId} handleAuth={handleAuth} collections={items} t={t} onClose={() => {
                        loadUserCollections();
                    }} />
                </TabPanel>
                <TabPanel value={value} index={2}>
                    <Grid container spacing={2}>
                        {/*<Grid item xs={12} md={6}>
                            <Preview />
                </Grid> */}
                        <Grid item xs={12}>
                            <Editor warning={jsonWarning} t={t}/>
                        </Grid>
                    </Grid>
                </TabPanel>
                <TabPanel value={value} index={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <NFTList t={t}/>
                        </Grid>
                    </Grid>
                </TabPanel>
              </Box>
            </Grid>
        </Grid>
    );

    const [activeStep, setActiveStep] = useState(1);

    return (
        <MinterContext.Provider value={context}>
            <React.Fragment>
                <CssBaseline />
                <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    opacity: 0.75,
                    background: `url(${background})`,
                    backgroundSize: 'cover',
                    width: '100%',
                    height: '100%',
                    zIndex: -1,
                    backgroundRepeat: 'repeat-y'
                }}></Box>
                <Grid container direction="column"
                                alignItems="center"
                                justifyContent="center"
                                spacing={1}
                                sx={{ margin: '0 auto' }}>
                    <Grid item xs={12} sx={{ m: 4 }}>
                        <Logo />
                    </Grid>
                    <Grid item xs={12}>
                        {
                            isAuthenticated && (
                                <div>
                                    <span><b>{t('Welcome')}</b> {formatAddress(user.get('ethAddress'))} </span>
                                    <IconButton aria-label="logout" color="primary" onClick={logout}>
                                        <LogoutIcon />
                                    </IconButton>
                                </div>
                            )
                        }
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h1" fontSize="1.75em" fontWeight={900}>{t('NFT Forge')}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h2" fontSize="1.2em" fontWeight={300}>{t('The simplest, yet most flexible way to create NFTs')} <i>{t('Anywhere')}</i></Typography>
                    </Grid>
                    {/*<Grid item xs={12} sx={{ mt: 3 }}>
                        <Steps activeStep={activeStep} />
                    </Grid> */}
                    
                </Grid>

    


                {authContent}
            </React.Fragment>
        </MinterContext.Provider>
    );
}

export default Tokenizer;