import { useStyletron } from "styletron-react";
import { useMobile } from "../shared/hooks/useMobile";
import { Card, COLORS, HeadingLarge, StyledBody } from "@nilfoundation/ui-kit";
import { getMobileStyles } from "../../styleHelpers";
import { $completedTutorials, Tutorial, TutorialLevel } from "./model";
import { history } from "../routing/routes/routes";
import { changeActiveTab, openTutorialText, setSelectedTutorial } from "../../pages/tutorials/model";
import { router } from "@nilfoundation/explorer-backend/trpc";
import { tutorialWithStageRoute } from "../routing/routes/tutorialRoute";
import { useUnit } from "effector-react";

const TutorialContainer = ({ tutorial }) => {
  const [isMobile] = useMobile();
  const [css] = useStyletron();

  const tutorialColor = (() => {
    switch (tutorial.level) {
      case TutorialLevel.Easy:
        return COLORS.green200;
      case TutorialLevel.Medium:
        return COLORS.yellow200;
      case TutorialLevel.Hard:
        return COLORS.orange200;
      case TutorialLevel.VeryHard:
        return COLORS.red200;
      default:
        return COLORS.gray200;
    }
  })();
  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "row",
        gap: "12px",
        marginBottom: "12px",
        borderRadius: "8px",
        backgroundColor: COLORS.blue800,
        padding: "16px",
        cursor: "pointer",
        ':hover': {
          backgroundColor: COLORS.blue700,
        }
      })}
      onClick={() => {
        tutorialWithStageRoute.open({ stage: tutorial.stage })
        setSelectedTutorial(tutorial);
        openTutorialText();
        if (isMobile) {
          changeActiveTab("0");
        }
      }}
    >
      <img src={tutorial.icon} className={css({
        width: "45px",
        height: "45px",
        borderRadius: "8px",
        backgroundColor: COLORS.blue900,
        padding: "8px",
      })} />
      <div className={css({
        display: "flex",
        flexDirection: "column",
      })}>
        <div className={css({
          fontSize: "22px",
          fontWeight: 500,
          marginBottom: "14px",
        })}>
          {tutorial.title}
        </div>
        <StyledBody className={css({
          color: COLORS.gray300,
        })}>
          {tutorial.description}
        </StyledBody>
        <div className={css({
          display: "flex",
          flexDirection: "row",
          fontSize: "12px",

        })}>
          <div className={css({
            color: COLORS.gray200,
          })}>
            {tutorial.completionTime}
          </div>
          <span style={{ marginRight: "4px", marginLeft: "4px" }}>|</span>
          <div className={css({
            color: tutorialColor
          })}>
            {tutorial.level.toString()}
          </div>
        </div>
      </div>

    </div>
  );
}

export const TutorialsPanel = ({ tutorials }) => {
  const completedTutorials = useUnit($completedTutorials);
  const [css] = useStyletron();
  const [isMobile] = useMobile();
  const completedTutorialsList = tutorials.filter((tutorial) => {
    if (completedTutorials.includes(tutorial.stage)) {
      return tutorial;
    }
  });
  const areCompletedTutorialsEmpty = completedTutorialsList.length === 0;
  return (
    <Card
      overrides={{
        Root: {
          style: {
            maxWidth: isMobile ? "calc(100vw - 20px)" : "none",
            width: isMobile ? "100%" : "none",
            backgroundColor: COLORS.blue900,
            flexDirection: "row",
            padding: "6px",
            height: "100%"
          }
        },
        Contents: {
          style: {
            height: "100%",
            maxWidth: "none",
            width: "100%",
            overflow: "auto",
            overscrollBehavior: "contain",
            display: "flex",
            ...getMobileStyles({
              height: "calc(100vh - 154px)",
            }),
          },
        },
        Body: {
          style: {
            height: "auto",
            width: "100%",
            maxWidth: "none",
          },
        },
      }}
    >
      {tutorials.map((tutorial: Tutorial) => {
        if (!completedTutorialsList.includes(tutorial)) {
          return <TutorialContainer tutorial={tutorial} />
        }
      })}
      {
        !areCompletedTutorialsEmpty && (
          <>
            <HeadingLarge
              className={css({
                fontSize: "32px",
                fontWeight: 500,
                marginBottom: "12px",
                lineHeight: "40px",
                marginTop: "10px",
              })}
            >
              Completed tutorials
            </HeadingLarge>
            {completedTutorialsList.map((tutorial: Tutorial) => (
              <TutorialContainer tutorial={tutorial} />
            ))}
          </>
        )
      }
    </Card>
  );
}
