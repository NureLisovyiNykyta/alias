import { Outlet } from 'react-router-dom';
import Header from '../nav/Header.jsx';
import Footer from '../nav/Footer.jsx';

const LobbyLayout = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col max-w-[1440px] mx-auto">
        <Header/>

        <div className="min-w-0 relative p-5">
          <Outlet/>
        </div>
      </div>
    </>
  );
};

export default LobbyLayout;
