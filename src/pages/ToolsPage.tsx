import { Apple, Droplets, Heart, Milk, Moon, NotebookPen, Pill, Scale, Thermometer } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function ToolsPage() {
  const [section, setSection] = useState<'apports' | 'suivi'>('apports');
  const navigate = useNavigate();
  const items =
    section === 'apports'
      ? [
          { key: 'feeding', label: 'Allaitement', icon: Heart, to: '/feeding' },
          { key: 'bottle', label: 'Biberon', icon: Milk, to: '/bottle' },
          { key: 'solids', label: 'Diversification', icon: Apple, soon: true },
          { key: 'supplements', label: 'Compléments', icon: Pill, soon: true },
        ]
      : [
          { key: 'diapers', label: 'Couche', icon: Droplets, to: '/diapers' },
          { key: 'pumping', label: 'Tire-lait', icon: Milk, to: '/pumping' },
          { key: 'growth', label: 'Croissance', icon: Scale, to: '/growth' },
          { key: 'sleep', label: 'Sommeil', icon: Moon, soon: true },
          { key: 'temp', label: 'Température', icon: Thermometer, soon: true },
          { key: 'notes', label: 'Notes', icon: NotebookPen, soon: true },
        ];

  return (
    <div className="screen">
      <h1>Outils</h1>
      <div className="switch">
        <button type="button" className={section === 'apports' ? 'on' : ''} onClick={() => setSection('apports')}>
          Apports
        </button>
        <button type="button" className={section === 'suivi' ? 'on' : ''} onClick={() => setSection('suivi')}>
          Suivi
        </button>
      </div>
      <p className="muted">{section === 'apports' ? 'Ce que l’on donne' : 'Ce que l’on observe'}</p>
      <div className="tiles">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`tile ${item.soon ? 'soon' : ''}`}
              disabled={item.soon}
              onClick={() => item.to && navigate(item.to)}>
              <span className="icon-wrap">
                <Icon size={28} />
              </span>
              {item.label}
              {item.soon ? <small className="muted">bientôt</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
