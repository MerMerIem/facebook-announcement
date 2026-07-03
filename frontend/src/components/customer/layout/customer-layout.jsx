import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const CustomerLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div dir="ltr">
                <Header />
            </div>

            <main className="flex-1">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
};

export default CustomerLayout;
