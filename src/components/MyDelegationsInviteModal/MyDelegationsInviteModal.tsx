import * as sdk from '@kiltprotocol/sdk-js'
import React from 'react'
import { connect, MapStateToProps } from 'react-redux'

import MessageRepository from '../../services/MessageRepository'
import * as Contacts from '../../state/ducks/Contacts'
import * as Delegations from '../../state/ducks/Delegations'
import { IMyDelegation } from '../../state/ducks/Delegations'
import * as Wallet from '../../state/ducks/Wallet'
import PersistentStore, {
  State as ReduxState,
} from '../../state/PersistentStore'
import { IContact, IMyIdentity } from '../../types/Contact'
import Modal, { ModalType } from '../Modal/Modal'
import SelectContacts from '../SelectContacts/SelectContacts'
import SelectDelegations from '../SelectDelegations/SelectDelegations'
import SelectPermissions from '../SelectPermissions/SelectPermissions'

import './MyDelegationsInviteModal.scss'

type StateProps = {
  myDelegations: IMyDelegation[]
  selectedIdentity: IMyIdentity
}

type OwnProps = {
  delegationsSelected?: IMyDelegation[]
  isPCR: boolean

  contactsPool?: IContact[]
  contactsSelected?: IContact[]
  delegationsPool?: IMyDelegation[]

  onCancel?: () => void
  onConfirm?: () => void
}

type Props = StateProps & OwnProps

type State = {
  contacts: {
    isSelectOpen: boolean
    selected: IContact[]

    pool?: IContact[]
  }
  delegations: {
    isSelectOpen: boolean
    selected: IMyDelegation[]

    pool?: IMyDelegation[]
  }
  permissions: sdk.Permission[]
}

class MyDelegationsInviteModal extends React.Component<Props, State> {
  private modal: Modal | null

  constructor(props: Props) {
    super(props)
    this.state = {
      contacts: {
        isSelectOpen: false,
        selected: props.contactsSelected || [],
      },
      delegations: {
        isSelectOpen: false,
        selected: props.delegationsSelected || [],
      },
      permissions: props.isPCR ? [1] : [],
    }

    this.cancel = this.cancel.bind(this)
    this.confirm = this.confirm.bind(this)

    this.changePermissions = this.changePermissions.bind(this)

    this.changeContacts = this.changeContacts.bind(this)
    this.setSelectContactsOpen = this.setSelectContactsOpen.bind(this)

    this.filterDelegations = this.filterDelegations.bind(this)
    this.changeDelegations = this.changeDelegations.bind(this)
    this.setSelectDelegationsOpen = this.setSelectDelegationsOpen.bind(this)
  }

  public componentDidMount(): void {
    const { contactsPool, delegationsPool, myDelegations }: Props = this.props

    this.createPools(
      contactsPool || Contacts.getMyContacts(PersistentStore.store.getState()),
      delegationsPool || myDelegations
    )
  }

  private getModalElement(): JSX.Element {
    const { contactsSelected, delegationsSelected, isPCR } = this.props
    const { contacts, delegations, permissions } = this.state

    const selectables = isPCR ? [] : ['permissions']
    if (!contactsSelected) {
      selectables.push('contact(s)')
    }
    if (!delegationsSelected) {
      selectables.push(isPCR ? 'PCR(s)' : 'delegation(s)')
    }

    return (
      <Modal
        ref={el => {
          this.modal = el
        }}
        catchBackdropClick={contacts.isSelectOpen || delegations.isSelectOpen}
        className="small"
        header={`Please select ${selectables.join(', ')}`}
        preventCloseOnCancel
        preventCloseOnConfirm
        type={ModalType.BLANK}
        showOnInit
      >
        {!isPCR && (
          <SelectPermissions
            permissions={permissions}
            onChange={this.changePermissions}
          />
        )}

        <div className="contactsSelect">
          {contactsSelected && <h2>Selected contact(s)</h2>}
          {!contactsSelected && <h2>Select contact(s)</h2>}
          {contacts.pool && (
            <SelectContacts
              contacts={contacts.pool}
              name="selectContactsForInvite"
              preSelectedAddresses={(contactsSelected || []).map(
                (contact: IContact) => contact.publicIdentity.address
              )}
              isMulti
              closeMenuOnSelect
              onChange={this.changeContacts}
              onMenuOpen={() => this.setSelectContactsOpen(true)}
              onMenuClose={() => this.setSelectContactsOpen(false, 500)}
            />
          )}
        </div>

        <div className="delegationsSelect">
          {delegationsSelected && (
            <h2>Selected {isPCR ? 'PCR' : 'delegation'}(s)</h2>
          )}
          {!delegationsSelected && (
            <h2>Select {isPCR ? 'PCR' : 'delegation'}(s)</h2>
          )}
          {delegations.pool && (
            <SelectDelegations
              delegations={delegations.pool}
              name="selectDelegationsForInvite"
              defaultValues={delegationsSelected}
              isMulti
              closeMenuOnSelect
              placeholder={isPCR ? `Select PCRs…` : undefined}
              filter={this.filterDelegations}
              onChange={this.changeDelegations}
              onMenuOpen={() => this.setSelectDelegationsOpen(true)}
              onMenuClose={() => this.setSelectDelegationsOpen(false, 500)}
            />
          )}
        </div>

        <footer>
          <button type="button" className="cancel" onClick={this.cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="invite"
            disabled={!this.isInvitationValid()}
            onClick={this.confirm}
          >
            Invite
          </button>
        </footer>
      </Modal>
    )
  }

  private getDelegationData(
    receiver: IContact,
    delegation: IMyDelegation
  ): sdk.IRequestAcceptDelegation['content']['delegationData'] {
    const { isPCR } = this.props
    const { permissions } = this.state

    return {
      account: receiver.publicIdentity.address,
      id: sdk.UUID.generate(),
      isPCR,
      parentId: delegation.id,
      permissions,
    }
  }

  private setSelectDelegationsOpen(
    isSelectOpen: boolean,
    delay?: number
  ): void {
    setTimeout(() => {
      const { delegations } = this.state
      this.setState({ delegations: { ...delegations, isSelectOpen } })
    }, delay)
  }

  private setSelectContactsOpen(isSelectOpen: boolean, delay?: number): void {
    setTimeout(() => {
      const { contacts } = this.state
      this.setState({ contacts: { ...contacts, isSelectOpen } })
    }, delay)
  }

  private changePermissions(newPermissions: sdk.Permission[]): void {
    this.setState({ permissions: newPermissions })
  }

  private changeContacts(selected: IContact[]): void {
    const { contacts } = this.state
    this.setState({ contacts: { ...contacts, selected } })
  }

  private changeDelegations(selected: IMyDelegation[]): void {
    const { delegations } = this.state
    this.setState({ delegations: { ...delegations, selected } })
  }

  private filterDelegations(delegation: IMyDelegation): boolean {
    const { isPCR } = this.props

    // check PCR
    if (isPCR != null && !delegation.isPCR !== !isPCR) {
      return false
    }

    // check revoked
    if (delegation.revoked) {
      return false
    }

    // check permissions
    return !(
      delegation.permissions &&
      !delegation.permissions.includes(sdk.Permission.DELEGATE)
    )
  }

  private cancel(): void {
    const { onCancel } = this.props
    if (onCancel) {
      onCancel()
    }
  }

  private confirm(): void {
    const { onConfirm } = this.props
    this.sendInvitations()
    if (onConfirm) {
      onConfirm()
    }
  }

  private isInvitationValid(): boolean {
    const { contacts, delegations, permissions } = this.state
    return (
      !!contacts.selected.length &&
      !!delegations.selected.length &&
      !!permissions.length
    )
  }

  public show(): void {
    if (this.modal) {
      this.modal.show()
    }
  }

  public hide(): void {
    if (this.modal) {
      this.modal.hide()
    }
  }

  private sendSingleInvitation(
    receiver: IContact,
    delegation: Delegations.Entry
  ): void {
    const { selectedIdentity } = this.props
    const { metaData } = delegation

    const delegationData = this.getDelegationData(receiver, delegation)

    const messageBody: sdk.IRequestAcceptDelegation = {
      content: {
        delegationData,
        metaData,
        signatures: {
          inviter: selectedIdentity.identity.signStr(
            JSON.stringify(delegationData)
          ),
        },
      },
      type: sdk.MessageBodyType.REQUEST_ACCEPT_DELEGATION,
    }

    MessageRepository.send([receiver], messageBody)
  }

  private sendInvitations(): void {
    const { contacts, delegations } = this.state

    if (this.isInvitationValid()) {
      contacts.selected.forEach((contact: IContact) => {
        delegations.selected.forEach((delegation: Delegations.Entry) => {
          this.sendSingleInvitation(contact, delegation)
        })
      })
    }
  }

  private createPools(
    contactsPool: IContact[],
    delegationsPool: IMyDelegation[]
  ): void {
    const { contactsSelected, delegationsSelected }: Props = this.props
    const { contacts, delegations }: State = this.state
    let combinedContactsPool = contactsPool
    let combinedDelegationsPool = delegationsPool

    // add selected contacts to pool if not already contained
    if (contactsSelected && contactsSelected.length) {
      const filteredContactsSelected = contactsSelected.filter(
        (selectedContact: IContact) =>
          !contactsPool.find(
            (poolContact: IContact) =>
              poolContact.publicIdentity.address ===
              selectedContact.publicIdentity.address
          )
      )
      combinedContactsPool = [...contactsPool, ...filteredContactsSelected]
    }

    // add selected delegations to pool if not already contained
    if (delegationsSelected && delegationsSelected.length) {
      const filteredContactsSelected = delegationsSelected.filter(
        (selectedDelegations: IMyDelegation) =>
          !delegationsPool.find(
            (poolDelegations: IMyDelegation) =>
              poolDelegations.id === selectedDelegations.id
          )
      )
      combinedDelegationsPool = [
        ...delegationsPool,
        ...filteredContactsSelected,
      ]
    }

    this.setState({
      contacts: {
        ...contacts,
        pool: combinedContactsPool,
      },
      delegations: {
        ...delegations,
        pool: combinedDelegationsPool,
      },
    })
  }

  public render(): JSX.Element {
    return (
      <section className="MyDelegationsInviteModal">
        {this.getModalElement()}
      </section>
    )
  }
}

const mapStateToProps: MapStateToProps<
  StateProps,
  OwnProps,
  ReduxState
> = state => ({
  myDelegations: Delegations.getAllDelegations(state),
  selectedIdentity: Wallet.getSelectedIdentity(state),
})

export default connect(mapStateToProps)(MyDelegationsInviteModal)
