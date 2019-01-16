import * as React from 'react'

import Select, { createFilter } from 'react-select'
import { Config } from 'react-select/lib/filters'

import ContactRepository from '../../services/ContactRepository'
import { Contact } from '../../types/Contact'
import { CType } from '../../types/Ctype'
import Modal from '../../components/Modal/Modal'
import CtypeRepository from '../../services/CtypeRepository'
import MessageRepository from '../../services/MessageRepository'
import { RequestClaimForCtype, MessageBodyType } from '../../types/Message'

import './ContactList.scss'

interface Props {}

interface State {
  contacts: Contact[]
  ctypes: CType[]
}

type SelectOption = {
  value: string
  label: string
}

class ContactList extends React.Component<Props, State> {
  private selectCtypeModal: Modal | null
  private selectedCtype: CType | undefined
  private selectedContact: Contact | undefined
  private filterConfig: Config = {
    ignoreAccents: true,
    ignoreCase: true,
    matchFrom: 'any',
    trim: true,
  }

  constructor(props: Props) {
    super(props)
    this.state = {
      contacts: [],
      ctypes: [],
    }
    this.onCancelRequestClaim = this.onCancelRequestClaim.bind(this)
    this.onFinishRequestClaim = this.onFinishRequestClaim.bind(this)
    this.onRequestClaimForVerification = this.onRequestClaimForVerification.bind(
      this
    )
    this.onSelectCtype = this.onSelectCtype.bind(this)
  }

  public componentDidMount() {
    ContactRepository.findAll().then((contacts: Contact[]) => {
      this.setState({ contacts })
    })
    CtypeRepository.findAll().then((ctypes: CType[]) => {
      this.setState({ ctypes })
    })
  }

  public render() {
    const { contacts } = this.state
    return (
      <section className="ContactList">
        <h1>Contacts</h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact: Contact) => (
              <tr key={contact.key}>
                <td className="contactName">{contact.name}</td>
                <td>{contact.key}</td>
                <td>
                  <div className="actions">
                    <button
                      className="requestClaimBtn"
                      title="Request claim for verification"
                      onClick={this.onRequestClaimForVerification(contact)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Modal
          ref={el => {
            this.selectCtypeModal = el
          }}
          type="confirm"
          header="Select CTYPE"
          onCancel={this.onCancelRequestClaim}
          onConfirm={this.onFinishRequestClaim}
        >
          {this.getSelectCtypes()}
        </Modal>
      </section>
    )
  }

  private getSelectCtypes() {
    const { ctypes } = this.state

    const options: SelectOption[] = ctypes.map((ctype: CType) => ({
      label: ctype.name,
      value: ctype.key,
    }))
    return (
      <Select
        className="react-select-container"
        classNamePrefix="react-select"
        isClearable={true}
        isSearchable={true}
        isDisabled={false}
        isMulti={false}
        isRtl={false}
        closeMenuOnSelect={true}
        name="selectCtypes"
        options={options}
        onChange={this.onSelectCtype}
        filterOption={createFilter(this.filterConfig)}
      />
    )
  }

  private onSelectCtype(selectedOption: SelectOption) {
    const { ctypes } = this.state

    this.selectedCtype = ctypes.find(
      (ctype: CType) => selectedOption.value === ctype.key
    )
  }

  private onCancelRequestClaim() {
    this.selectedCtype = undefined
  }

  private onFinishRequestClaim() {
    if (this.selectedContact && this.selectedCtype) {
      const cTypeMessageBody = {
        author: this.selectedCtype.author,
        key: this.selectedCtype.key,
        name: this.selectedCtype.name,
      }
      const request: RequestClaimForCtype = {
        content: cTypeMessageBody,
        type: MessageBodyType.REQUEST_CLAIM_FOR_CTYPE,
      }

      MessageRepository.send(this.selectedContact, request)
    }
  }

  private onRequestClaimForVerification = (
    contact?: Contact
  ): (() => void) => () => {
    this.selectedContact = contact
    if (this.selectCtypeModal) {
      this.selectCtypeModal.show()
    }
  }
}

export default ContactList
