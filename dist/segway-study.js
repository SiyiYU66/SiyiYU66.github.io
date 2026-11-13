// Project copy supplied by Siyi Yu. Demonstration: the supplied balancing.mp4.
const media='./assets/projects/balancing-segway/';

export const segwayProject={
  id:'balancing-segway',art:8,demo:false,
  name:'Balancing Segway',discTitle:'Balancing Segway',discSubtitle:'MICROPYTHON / CLOSED-LOOP CONTROL',
  year:'2026',category:'Robotics / Control Systems',role:'Embedded Software & Control',
  cover:media+'pybench.webp',coverInk:'#202320',
  coverCrop:{fit:'disc',zoom:.84,positionX:.5,positionY:.68,background:'#e8e8e4'},
  hero:media+'balancing-tabletop.png',heroAlt:'The two-wheeled PyBench robot balancing upright on a tabletop during a hands-on test',
  heroFit:'contain',heroBackground:'#141b21',
  overview:'A two-wheeled robot balancing itself with a 200 Hz PID loop',
  description:'A self-balancing robot built in MicroPython, combining IMU sensor fusion with closed-loop motor control.',
  headline:'Finding balance, 200 times a second.',
  lede:'A two-wheeled robot that keeps itself upright. Built in MicroPython on the PyBench board for Electronics 2, it blends motion-sensor readings and drives two motors through a PID control loop.',
  collection:'Electronics 2',
  credits:[['COURSE','Electronics 2'],['BUILT WITH','MicroPython · PyBench']],
  caseStudy:{
    chapters:[
      {
        label:'The platform',title:'A small robot. A continuous correction.',
        intro:'The PyBench board combines the controller, motion sensors and motor driver. The two-wheeled robot reads its tilt 200 times a second and adjusts both motors to recover its balance.',
        notes:[['200 Hz','A tilt measurement and control update every 5 milliseconds.'],['Two driven wheels','Both motors respond to the same upright-balance objective.']],
        figures:[{src:media+'pybench.webp',width:1000,height:848,caption:'PyBench board · Pyboard, IMU, microphone, motor driver and screen',wide:true,background:'transparent',borderless:true}]
      },
      {
        label:'Sensor fusion',title:'Two imperfect sensors. One steady estimate.',
        intro:'Integrating the gyroscope gives a smooth short-term angle estimate, but it slowly drifts. The accelerometer provides a gravity reference but is noisy. A complementary filter blends 95% of the gyro-based estimate with 5% of the accelerometer angle.',
        notes:[['Gyroscope · 95%','Tracks fast changes in tilt.'],['Accelerometer · 5%','Corrects the long-term drift.']]
      },
      {
        label:'PID control',title:'Push. Accumulate. Dampen.',
        intro:'The estimated tilt is compared with upright. Three terms combine into one motor command: a correction for the current error, its accumulated history and the measured rate of motion.',
        pid:{
          terms:[
            {term:'P',name:'Proportional',gain:'p',meaning:'The current tilt error sets the corrective push. A larger error produces a stronger motor command.',excess:'Too much P makes the robot oscillate around upright.'},
            {term:'I',name:'Integral',gain:'i',meaning:'Accumulated error removes a persistent offset that the proportional term alone cannot correct.',excess:'Too much I causes wind-up and overshoot.'},
            {term:'D',name:'Derivative',gain:'d',meaning:'The gyroscope rate damps the response as the robot approaches upright, helping it settle instead of swinging past.',excess:'Too much D makes the controller sensitive to sensor noise.'}
          ],
          tuning:{
            title:'One gain at a time.',
            text:'We suspended the robot from elastic cord while tuning, watched how it failed and identified which control term was responsible. Changing one gain at a time helped separate oscillation, steady offset and overshoot, until the robot stood on its own.',
            rateNote:'The derivative term uses the measured gyroscope rate. This avoids differentiating angle estimates over a very small time step, which can amplify noise.'
          },
          video:{type:'video',src:'/media/balancing-segway.mp4',poster:media+'poster.webp',width:720,height:720,wide:true,caption:'In motion · The two-wheeled robot balancing under PID control'}
        }
      }
    ],
    resourcesLabel:'Course & hardware',
    links:[{label:'Professor Peter Cheung · Imperial College London',href:'http://www.ee.ic.ac.uk/pcheung/'}]
  }
};
