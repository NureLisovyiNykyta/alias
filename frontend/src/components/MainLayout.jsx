import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import Footer from './Footer';

const MainLayout = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col max-w-[1440px] mx-auto">
        <Header/>

        <div className="flex-1 grid grid-cols-[auto_1fr]">
          <Navigation/>

          <div className="min-w-0 relative p-5">
            <Outlet/>
          </div>
        </div>
      </div>

      <Footer/>
    </>
  );
};

export default MainLayout;
