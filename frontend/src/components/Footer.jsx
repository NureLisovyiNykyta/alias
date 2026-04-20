import { Link } from "react-router-dom";
import mail from '@/assets/whiteMail.svg';
import fb from '@/assets/facebook.svg';
import tg from '@/assets/telegram.svg';

const Links = [
  { id: 'terms', href: '/terms', text: 'Terms of Use' },
  { id: 'privacy', href: '/privacy', text: 'Privacy Policy' },
  { id: 'cookies', href: '/cookies', text: 'Cookie Preferences' },
];

const Footer = () => {
  return (
    <footer className='bg-text h-10 flex items-center gap-[320px] px-[71px] w-full justify-center'>
      <span className="font-zen text-sm-logo text-white">
        alias
      </span>

      <ul className='flex items-center gap-[35px]'>
        {Links.map(link => (
          <li key={link.id} className='text-label font-noto text-white'>
            <Link to={link.href} target='_blank' rel='noopener noreferrer'>
              {link.text}
            </Link>
          </li>
        ))}
      </ul>

      <div className='flex items-center gap-8 text-white'>
        <div className='flex items-center gap-2'>
          <img src={mail} alt=""/>
          <span className='text-label font-noto'>admin@alias.com</span>
        </div>

        <img src={fb} alt=""/>
        <img src={tg} alt=""/>
      </div>

    </footer>
  );
};

export default Footer;
