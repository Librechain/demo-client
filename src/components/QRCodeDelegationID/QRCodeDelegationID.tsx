import React from 'react'
import { QRCode } from 'react-qrcode-logo'
import logo from '../../assets/kilt_small.svg'
import {
  encodePublicIdentityWithDelegation,
  IAttesterWithDelegation,
} from '../../utils/PublicIdentity/Encoding'
import { IMyDelegation } from '../../state/ducks/Delegations'
import { IMyIdentity } from '../../types/Contact'

type Props = {
  delegationId: IMyDelegation['id']
  selectedIdentity: IMyIdentity
}

const QRCodeDelegationID: React.FunctionComponent<Props> = ({
  delegationId,
  selectedIdentity,
}) => {
  const publicIdentityWithDelegation: IAttesterWithDelegation = {
    publicIdentity: selectedIdentity.identity.getPublicIdentity(),
    delegationId,
  }
  const formattedDelegationID = JSON.stringify(
    encodePublicIdentityWithDelegation(publicIdentityWithDelegation)
  )
  return (
    <QRCode
      size={250}
      logoImage={logo}
      logoWidth={44}
      logoHeight={44}
      fgColor="#751869"
      quietZone={4}
      qrStyle="dots"
      value={formattedDelegationID}
    />
  )
}

export default QRCodeDelegationID
