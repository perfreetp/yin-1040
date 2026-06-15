import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import DataImport from '@/pages/DataImport';
import Prediction from '@/pages/Prediction';
import CustomerCollection from '@/pages/CustomerCollection';
import SupplierPayment from '@/pages/SupplierPayment';
import Scenario from '@/pages/Scenario';
import AlertPage from '@/pages/AlertPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/data-import" element={<DataImport />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/customer-collection" element={<CustomerCollection />} />
          <Route path="/supplier-payment" element={<SupplierPayment />} />
          <Route path="/scenario" element={<Scenario />} />
          <Route path="/alert" element={<AlertPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
