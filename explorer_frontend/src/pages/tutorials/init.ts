import { persist } from "effector-storage/session";
import {
  compileCodeFx,
  loadedTutorialPage,
  clickOnBackButton,
  clickOnContractsButton,
  clickOnLogButton,
} from "../../features/code/model";
import {
  $activeComponentTutorial,
  $tutorialChecksState,
  TutorialChecksStatus,
  TutorialLayoutComponent,
  setTutorialChecksState,
  openTutorialText,
  setSelectedTutorial,
  $selectedTutorial,
  clickOnTutorialsBackButton,
} from "./model";
import { sample } from "effector";
import { tutorialWithStageRoute } from "../../features/routing/routes/tutorialRoute";

$activeComponentTutorial.on(clickOnLogButton, () => TutorialLayoutComponent.Logs);
$activeComponentTutorial.on(clickOnContractsButton, () => TutorialLayoutComponent.Contracts);
$activeComponentTutorial.on(clickOnBackButton, () => TutorialLayoutComponent.Code);
$activeComponentTutorial.on(openTutorialText, () => TutorialLayoutComponent.TutorialText);
$activeComponentTutorial.on(clickOnTutorialsBackButton, () => TutorialLayoutComponent.Tutorials);
$tutorialChecksState.on(setTutorialChecksState, (_, payload) => payload);
$tutorialChecksState.on(compileCodeFx.doneData, () => TutorialChecksStatus.Initialized);

sample({
  clock: setSelectedTutorial,
  target: $selectedTutorial,
});

sample({
  clock: clickOnTutorialsBackButton,
  fn: () => null,
  target: setSelectedTutorial,
});

sample({
  clock: [loadedTutorialPage, tutorialWithStageRoute.$params],
  fn: () => TutorialChecksStatus.NotInitialized,
  target: setTutorialChecksState,
});
$tutorialChecksState.on(compileCodeFx.doneData, () => TutorialChecksStatus.Initialized);


persist({
  store: $activeComponentTutorial,
  key: "activeComponentTutorial",
});
