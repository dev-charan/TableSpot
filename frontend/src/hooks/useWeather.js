import { useState, useEffect } from 'react';
import axios from 'axios';

export const useWeather = (lat = 19.076, lng = 72.8777) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: lat,
            longitude: lng,
            current: 'temperature_2m,weathercode,precipitation',
            timezone: 'auto',
          },
        });
        const code = data.current.weathercode;
        const temp = data.current.temperature_2m;
        const rain = data.current.precipitation > 0;

        let condition = 'clear';
        if (code >= 51 && code <= 67) condition = 'rainy';
        else if (code >= 71 && code <= 77) condition = 'snowy';
        else if (code >= 80) condition = 'stormy';
        else if (code >= 2 && code <= 48) condition = 'cloudy';

        setWeather({ temp, condition, rain, code });
      } catch {}
    };
    fetchWeather();
  }, [lat, lng]);

  return weather;
};
