import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

const uploadContainer = {
    color: '#757575',
    border: '1px solid #eaeaea',
    borderRadius: 10,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 40
};

const thumbsContainer = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 16,
  borderRadius: 10
};

const thumb = {
  display: 'inline-flex',
  borderRadius: 2,
  border: '1px solid #eaeaea',
  marginBottom: 8,
  marginRight: 8,
  width: 100,
  height: 100,
  padding: 4,
  boxSizing: 'border-box'
};

const thumbInner = {
  display: 'flex',
  minWidth: 0,
  overflow: 'hidden'
};

const img = {
  display: 'block',
  width: 'auto',
  height: '100%'
};


const Dropzone = ({ initialFiles=[], handleChange, t=()=>{} }) => {
    // state inside dropzone
    const [files, setFiles] = useState(initialFiles);
    const {getRootProps, getInputProps} = useDropzone({
        accept: {
        'image/*': ['.png', '.jpeg'],
        'video/*': ['.mp3'],
        'audio/*': ['.mp4']
        },
        onDrop: acceptedFiles => {
            // set state in dropzone, for visibility
            setFiles(acceptedFiles.map(file => Object.assign(file, {
            preview: URL.createObjectURL(file)})));
            // set state in tokenizer, to make change persistent, since dropzone gets unmounted
            handleChange(acceptedFiles)    
        }
    });

    const thumbs = files.map(file => (
        <div style={thumb} key={file.name}>
        <div style={thumbInner}>
            <img
            src={file.preview}
            style={img}
            />
        </div>
        </div>
  ));

  return (
    <>
    <section {...getRootProps({className: 'dropzone', style: uploadContainer})}>
        <div>
            <input {...getInputProps()} />
            <p>{t("Drop your jpeg, png, mp3 audio and mp4 videos up to 10mb")}</p>
        </div>
    </section>
    <aside style={thumbsContainer}>
        {thumbs}
    </aside>
    </>
  );
}

export default Dropzone;