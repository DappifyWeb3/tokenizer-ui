import { useContext, useState, useEffect } from 'react';
import { Box, Grid, Button, Typography } from '@mui/material';
import { MinterContext } from 'components';
import CollectionDialog from 'components/CollectionDialog';
import isEmpty from 'lodash/isEmpty';
import { DappifyContext } from 'react-dappify';
import WalletsDialog from 'components/WalletsDialog';

const Collections = ({t, handleAuth, collections, onClose, hidden=false }) => {
    const {minter, setMinter} = useContext(MinterContext);
    const { Provider, isAuthenticated } = useContext(DappifyContext);
    const [createCollectionDialog, setCreateCollectionDialog] = useState();
    const [config, setConfig] = useState({});
    const [showWalletDialog, setShowWalletDialog] = useState(false);

    const loadLocalConfig = async () => {
        const cfg = await fetch(`dappify.json`)
        .then((r) => r.json())
        setConfig(cfg);
    };

    const setDefaultCollection = async () => {
        const newMinter = {...minter};
        newMinter.collection = config?.contract[minter.chainId];
        setMinter(newMinter);
    };

    useEffect(() => {
        loadLocalConfig();
    }, []);

    useEffect(() => {
        if (!isEmpty(config)) {
            console.log(config.contract);
            const defaultCollection = config?.contract[minter.chainId];
            if (!isEmpty(defaultCollection)){
                setDefaultCollection();
            }
        }
    }, [minter.chainId, config]);

    const handleChange = (files) => {
        const targetFile = files[0];
        const newMinter = {...minter};
        newMinter.collectionMetadata.image = targetFile;
        setMinter(newMinter);
    }

    // const defaultDappifyCollection = (
    //     <Grid item xs={6}>
    //         <Button disableElevation variant={ minter.collection === constants.CONTRACTS.tokenizer[minter.chainId] ? 'contained' : 'outlined' } fullWidth onClick={() => {
    //             const newMinter = {...minter};
    //             newMinter.collection = constants.CONTRACTS.tokenizer[minter.chainId];
    //             setMinter(newMinter);
    //         }}>
    //             Dappify Collection
    //         </Button>
    //     </Grid>
    // );

    const collectionItem = (collection, onClick) => (
        <Grid item key={collection.metadata.name}>
            <Button disableElevation
                    fullWidth
                    sx={{
                        height: 175,
                        width: 175,
                        mr: 2,
                        overflow: 'hidden'
                    }}
                    variant={minter?.collection && minter?.collection[minter?.type] === collection?.contract ? 'contained' : 'outlined'}
                    onClick={onClick}>
                    <Grid container>
                        <Box sx={{
                            position: 'absolute',
                            background: `url(${collection.metadata.image})`,
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat',
                            height: 175,
                            width: 175,
                            left: 0,
                            top: 0,
                            opacity: 0.25
                        }} />
                        <Grid item xs={12}>
                            <Typography variant="h4" fontWeight="bold">{collection.metadata.name}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body">{collection.metadata.description}</Typography>
                        </Grid>
                    </Grid>
            </Button>
        </Grid>
    )

    const newCollection = collectionItem({
        metadata: {
            image: 'https://i.ibb.co/5MSMLFr/output-onlinepngtools-2.png',
            name: 'Add New',
            description: ''
        }
    }, async() => {
        if (!isAuthenticated) {
            setShowWalletDialog(true);
        } else {
            await Provider.switchNetwork(minter.chainId);
            setCreateCollectionDialog(true);
        }
    });

    const dappifyCollection =   minter?.chainId && 
                                config?.contract && 
                                config?.contract[minter?.chainId] && 
                                config?.contract[minter?.chainId][minter.type] &&
                                collectionItem({
        contract: config?.contract[minter?.chainId][minter.type],
        metadata: {
            image: 'https://i.ibb.co/5MSMLFr/output-onlinepngtools-2.png',
            name: 'Dappify',
            description: 'Default Collection'
        }
    }, () => {
        setDefaultCollection();
    });

    const renderCollections = () => {
        const list = [
            newCollection,
            dappifyCollection
        ];
        const elements = collections?.results?.filter((item) => item.chainId === minter.chainId && item.type === minter.type) || [];
        elements.forEach((collection) => {
            console.log(collection);
            console.log(minter);
            list.push(collectionItem(collection, () => {
                const newMinter = {...minter};
                newMinter.collection = {};
                newMinter.collection[newMinter.type] = collection.contract;
                setMinter(newMinter);
            }))
        })
        return list;
    }

    const collectionSelector = (
        <Grid container sx={{ width: '100%', mt: 2  }} spacing={2}>
            <WalletsDialog isOpen={showWalletDialog} onClose={() => setShowWalletDialog(false)} t={t} />
            <Grid item xs={12}>
                <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h1" fontSize="1.3em" fontWeight="bold">{t('4. Select a Smart Contract')} ({minter.type})</Typography>
                    <Typography variant="body" fontSize="1em" fontWeight="300">
                        {t('Use an existing NFT smart contract or launch your new one to create your NFTs on')}
                    </Typography>
                </Grid>
            </Grid>
            <Grid container sx={{ p: 2 }} spacing={1}>
                {minter.chainId && renderCollections()}
            </Grid>
            <CollectionDialog open={createCollectionDialog} t={t} onClose={() => {
                onClose();
                setCreateCollectionDialog(false);
            }} handleChange={handleChange} handleAuth={handleAuth} />
        </Grid>
    )
    return !hidden ? (collectionSelector) : <span />
}

export default Collections;