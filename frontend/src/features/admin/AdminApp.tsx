import React from 'react';
import AdminLayout from './AdminLayout';
import AdminOrders from './orders/AdminOrders';
import AdminOrderDetail from './orders/AdminOrderDetail';
import AdminProducts from './products/AdminProducts';
import AdminCategories from './categories/AdminCategories';
import AdminReviews from './reviews/AdminReviews';
import AdminContact from './contact/AdminContact';

interface AdminAppProps {
  route: string;
  query: string;
}

export default function AdminApp({ route, query }: AdminAppProps) {
  // Chuẩn hóa route
  if (route.startsWith('/admin/orders/')) {
    const id = decodeURIComponent(route.replace('/admin/orders/', ''));
    return (
      <AdminLayout activeTab="orders">
        <AdminOrderDetail id={id} search={query} />
      </AdminLayout>
    );
  }

  if (route === '/admin/products') {
    return (
      <AdminLayout activeTab="products">
        <AdminProducts search={query} />
      </AdminLayout>
    );
  }

  if (route === '/admin/categories') {
    return (
      <AdminLayout activeTab="categories">
        <AdminCategories />
      </AdminLayout>
    );
  }

  if (route === '/admin/reviews') {
    return (
      <AdminLayout activeTab="reviews">
        <AdminReviews search={query} />
      </AdminLayout>
    );
  }

  if (route === '/admin/contact') {
    return (
      <AdminLayout activeTab="contact">
        <AdminContact search={query} />
      </AdminLayout>
    );
  }

  // Mặc định là /admin hoặc /admin/orders
  return (
    <AdminLayout activeTab="orders">
      <AdminOrders search={query} />
    </AdminLayout>
  );
}
