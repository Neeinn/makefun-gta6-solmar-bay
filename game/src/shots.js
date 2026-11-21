// Screenshot staging for Solmar Bay. The ?shot= query parameter puts the
// game into a fixed, good-looking pose so the maker's screenshots are real
// renders of the game: start (title), driving, mission, chase.
//   ?shot=start   — title screen over the city
//   ?shot=driving — Milo driving a car down Neon Row
//   ?shot=mission — mission 3 in progress, package beacon ahead
//   ?shot=chase   — 3-star police chase in Downtown
// When the pose has settled, window.__shotReady is set to true.

export function stageShot(G, name) {
  const set = (fn) => { try { fn(); } catch (err) { /* staging is best-effort */ } };
  if (name === 'start') {
    // Title screen: keep the game on the start overlay, camera over the city.
    G.camera.position.set(-40, 55, 190);
    G.camera.lookAt(0, 0, 40);
    G.shotCamera = true;
    window.__shotReady = true;
    return;
  }
  // Every other shot starts the game for real.
  G.startGame(false);
  if (name === 'driving') {
    set(() => {
      // Bright yellow car, on road x=-40 heading north, so it drives
      // cleanly down the road instead of into a block.
      const car = G.vehicles.parked[2];
      G.enterCar(car);
      car.x = -40; car.z = -60; car.heading = Math.PI;
      car.speed = 26;
      G.player.pos.set(car.x, 0, car.z);
      G.player.heading = car.heading;
      G.autoDrive = true;
    });
  } else if (name === 'mission') {
    set(() => {
      G.missions.setMission(2);
      G.player.pos.set(-120, 0, -20);
      G.player.heading = Math.PI / 2;
      G.player.money = 1250;
    });
  } else if (name === 'chase') {
    set(() => {
      // Blue car on road z=-40 heading east, police closing in behind it.
      const car = G.vehicles.parked[1];
      G.enterCar(car);
      car.x = 40; car.z = -40; car.heading = Math.PI / 2;
      car.speed = 30;
      G.player.pos.set(car.x, 0, car.z);
      G.player.heading = car.heading;
      G.player.wanted = 3;
      G.player.money = 2400;
      G.missions.setMission(3);
      G.vehicles.spawnPoliceNear(car.x, car.z, 3);
      // Put one police car ahead-side of the player so the chase reads in
      // the frame: it closes in on the player as the shot is taken.
      const lead = G.vehicles.police[0];
      if (lead) {
        lead.x = car.x + 38;
        lead.z = car.z - 10;
        lead.heading = -Math.PI / 2;
        lead.speed = 25;
      }
      G.autoDrive = true;
    });
  }
  // Let the scene render a couple of seconds so cars, police and the beacon
  // settle into place before the screenshot is taken. The chase and driving
  // shots settle faster, while the car is still mid-city.
  const delay = name === 'chase' ? 1500 : name === 'driving' ? 1800 : 2600;
  setTimeout(() => { window.__shotReady = true; }, delay);
}
