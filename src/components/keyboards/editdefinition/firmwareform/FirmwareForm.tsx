import React, { useState } from 'react';
import {
  FirmwareFormActionsType,
  FirmwareFormStateType,
} from './FirmwareForm.container';
import './FirmwareForm.scss';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  TextField,
  Typography,
} from '@material-ui/core';
import { IFirmware } from '../../../../services/storage/Storage';
import moment from 'moment';

type OwnProps = {};
type FirmwareFormProps = OwnProps &
  Partial<FirmwareFormActionsType> &
  Partial<FirmwareFormStateType>;

export default function FirmwareForm(props: FirmwareFormProps) {
  const dropTargetRef = React.createRef<HTMLDivElement>();

  const [dragging, setDragging] = useState<boolean>(false);

  const onDragOverFirmwareFile = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const onDragLeaveFirmwareFile = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
  };

  const onDropFirmwareFile = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      return;
    }
    const file = files[0];
    props.updateFirmwareFile!(file);
  };

  const onClickUploadButton = () => {
    props.uploadFirmwareFile!();
  };

  const onClickClearButton = () => {
    props.clearFirmwareForm!();
  };

  const isFilledInAllFields = () => {
    return (
      props.firmwareFile !== null &&
      props.firmwareName !== '' &&
      props.firmwareDescription !== ''
    );
  };

  const onClickDownload = (firmware: IFirmware) => {
    props.fetchFirmwareFileBlob!(firmware.filename, (blob: any) => {
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.download = firmware.filename.substring(
        firmware.filename.lastIndexOf('/') + 1
      );
      a.href = downloadUrl;
      a.click();
      a.remove();
    });
  };

  const firmwareFileInfo = props.firmwareFile
    ? `${props.firmwareFile!.name} - ${props.firmwareFile!.size} bytes`
    : '';

  const sortedFirmwares = props
    .definitionDocument!.firmwares.slice()
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  return (
    <div className="edit-definition-firmware-form-container">
      <div className="edit-definition-firmware-form-panel-left">
        {!props.firmwareFile ? (
          <div className="edit-definition-firmware-form-row">
            <div
              className={
                dragging
                  ? 'edit-definition-firmware-form-upload-area edit-definition-firmware-form-upload-area-active'
                  : 'edit-definition-firmware-form-upload-area'
              }
              onDragOver={onDragOverFirmwareFile}
              onDrop={onDropFirmwareFile}
              onDragLeave={onDragLeaveFirmwareFile}
            >
              <div
                className="edit-definition-firmware-form-upload-message"
                ref={dropTargetRef}
              >
                Drop Firmware here
              </div>
            </div>
          </div>
        ) : null}
        {props.firmwareFile ? (
          <div className="edit-definition-firmware-form-row">
            <FormControl>
              <TextField
                label="Firmware Local File"
                variant="outlined"
                value={`${props.firmwareFile ? firmwareFileInfo : ''}`}
                InputProps={{
                  readOnly: true,
                }}
              />
            </FormControl>
          </div>
        ) : null}
        <div className="edit-definition-firmware-form-row">
          <FormControl>
            <TextField
              label="Firmware Name"
              variant="outlined"
              value={props.firmwareName}
              onChange={(event) => {
                props.updateFirmwareName!(event.target.value);
              }}
            />
          </FormControl>
        </div>
        <div className="edit-definition-firmware-form-row">
          <FormControl>
            <TextField
              label="Description"
              variant="outlined"
              value={props.firmwareDescription}
              multiline
              rows={4}
              onChange={(event) => {
                props.updateFirmwareDescription!(event.target.value);
              }}
            />
          </FormControl>
        </div>
        <div className="edit-definition-firmware-form-buttons">
          <Button
            color="primary"
            style={{ marginRight: '8px' }}
            onClick={onClickClearButton}
          >
            Clear
          </Button>
          <Button
            color="primary"
            style={{ marginRight: '8px' }}
            variant="contained"
            onClick={onClickUploadButton}
            disabled={!isFilledInAllFields()}
          >
            Upload
          </Button>
        </div>
      </div>
      <div className="edit-definition-firmware-form-panel-right">
        {sortedFirmwares.map((firmware, index) => (
          <FirmwareCard
            key={`firmware-card-${index}`}
            firmware={firmware}
            onClickDownload={onClickDownload}
          />
        ))}
      </div>
    </div>
  );
}

type IFirmwareCardProps = {
  firmware: IFirmware;
  // eslint-disable-next-line no-unused-vars
  onClickDownload: (firmware: IFirmware) => void;
};

function FirmwareCard(props: IFirmwareCardProps) {
  return (
    <Card variant="outlined" className="edit-definition-firmware-form-card">
      <CardContent>
        <Typography variant="h5" component="h2">
          {props.firmware.name}
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          {props.firmware.description}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {moment(props.firmware.created_at).format('MMMM Do YYYY, HH:mm:ss')}{' '}
          <br />
          SHA256: {props.firmware.hash}
        </Typography>
      </CardContent>
      <CardActions className="edit-definition-firmware-form-card-buttons">
        <Button size="small" color="primary">
          Delete
        </Button>
        <Button
          size="small"
          color="primary"
          onClick={() => {
            props.onClickDownload(props.firmware);
          }}
        >
          Download
        </Button>
      </CardActions>
    </Card>
  );
}
