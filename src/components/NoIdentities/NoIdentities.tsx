import * as React from 'react'
import { Link } from 'react-router-dom'

const NoIdentities = () => {
  return (
    <section className="NoIdentities">
      <span>No identities found. Please </span>
      <Link to="/wallet/add">Create a new identity</Link>.
    </section>
  )
}

export default NoIdentities