import runTutorialCheckOne from "./checks/tutorialOneCheck";
import runTutorialCheckTwo from "./checks/tutorialTwoCheck";

export const spec = [
  {
    stage: 1,
    check: runTutorialCheckOne,
  },
  {
    stage: 2,
    check: runTutorialCheckTwo,
  }
];
