import Layout from '../components/Layout'
import ValidationPage from '../components/ValidationPage'

export function PricePage() {
  return (
    <Layout title="File Price" subtitle="Validasi format file Price — 5 kolom, Tab-separated">
      <ValidationPage type="price" />
    </Layout>
  )
}

export function InventoryPage() {
  return (
    <Layout title="File Inventory" subtitle="Validasi format file Inventory — 4 kolom, Tab-separated">
      <ValidationPage type="inventory" />
    </Layout>
  )
}

export function MasterPage() {
  return (
    <Layout title="File Master Product" subtitle="Validasi format file Master Product — 16 kolom, Tab-separated">
      <ValidationPage type="master" />
    </Layout>
  )
}
