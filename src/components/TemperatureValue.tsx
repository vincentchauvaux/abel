import { formatTemperature, temperatureLevelClass } from '@/lib/temperature';

type Props = {
  celsius: number;
  as?: 'strong' | 'span' | 'b';
};

export function TemperatureValue({ celsius, as: Tag = 'strong' }: Props) {
  return <Tag className={temperatureLevelClass(celsius)}>{formatTemperature(celsius)} °C</Tag>;
}
