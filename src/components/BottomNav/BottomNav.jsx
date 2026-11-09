import { NavLink } from 'react-router-dom';
import { navItems, addIcon } from './navConfig.js';
import './BottomNav.scss';

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `bottom-nav-item${isActive ? ' bottom-nav-item-active' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          <img
            className="bottom-nav-icon"
            src={isActive ? item.activeIcon : item.icon}
            alt={item.label}
          />
          <span className="bottom-nav-label">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function BottomNav({ onAddClick }) {
  const left = navItems.slice(0, 2);
  const right = navItems.slice(2);

  return (
    <nav className="bottom-nav">
      {left.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}

      {/* + 버튼 클릭 시 모달 오픈 함수 실행 */}
      <button
        type="button"
        className="bottom-nav-add"
        onClick={onAddClick}
      >
        <img src={addIcon} alt="링크 추가" className="bottom-nav-add-icon" />
      </button>

      {right.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </nav>
  );
}

export default BottomNav;