import { useEffect, useState, useContext } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { MinterContext } from 'components';
import { Typography, Grid, Alert } from '@mui/material';

const Editor = ({warning, t}) => {
    const [hasError, setHasError] = useState();
    const {minter, setMinter} = useContext(MinterContext);

    // minter.medatata?.attributes = attributes;
    const [code, setCode] = useState('');

    const showJsonWarning = () => {
        return warning && warning.includes("Please do not modify the respective field inside the json metadata.");
    }

    useEffect(() => {
        setHasError(false);
        try {
            const newMinter = {...minter};
            newMinter.metadata = JSON.parse(code);
            // Has attributes?
            newMinter.metadataAttributes = newMinter.metadata.attributes;
            setMinter(newMinter);
        } catch (e) {
            setHasError(true);
            console.log(e);
        }
    }, [code])

    useEffect(() => {
        const additionalFields = [];
        minter.additionalFields.forEach((field) => {
            additionalFields[[field.key]] =  field.value
        })
        minter.metadata.attributes = minter.metadataAttributes;
        console.log(minter);

        setCode(JSON.stringify({ ...minter.metadata, ...additionalFields }, null, 2));
    
    }, []);


    return (
        <Grid container spacing={2}>
            <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h1" fontSize="1.3em" fontWeight="bold">{t('Edit the metadata source code directly')}</Typography>
                <Typography variant="body" fontSize="1em" fontWeight="300">
                    {t('We recommend setting attributes through the basic/advanced tabs functionalities but if they fall short you can always edit manually. Notice that modifying this file will change the metadata, but these changes may not be visible by other tabs.')}
                </Typography>
            </Grid>
            
            { showJsonWarning() &&  
                (<Grid>
                    <Alert severity="warning">   
                        {warning}
                    </Alert>
                </Grid>)
            }
            {hasError && (
                <Grid item xs={12} sx={{ minHeight: 70 }}>
                    <Alert severity="error">{t('Invalid JSON structure')}</Alert>
                </Grid>
            )}
            <Grid item xs={12}>
                <CodeEditor
                    value={code}
                    language="json"
                    onChange={(evn) => setCode(evn.target.value)}
                    padding={15}
                    style={{
                        fontSize: 12,
                        backgroundColor: "#f5f5f5",
                        fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                    }}
                />
            </Grid>
        </Grid>
  );
}

export default Editor;