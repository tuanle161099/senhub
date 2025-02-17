import { useHistory } from 'react-router-dom'
import { useDispatch } from 'react-redux'

import { Row, Col, Button, Card, Typography } from 'antd'
import IonIcon from 'shared/antd/ionicon'

import { setVisibleActionCenter } from 'os/store/ui.reducer'
import { RootDispatch } from 'os/store'

const Sync = () => {
  const dispatch = useDispatch<RootDispatch>()
  const history = useHistory()

  return (
    <Card bodyStyle={{ padding: 16 }} hoverable bordered={false}>
      <Row gutter={[16, 22]}>
        <Col span={24}>
          <Typography.Text>Backup & Restore</Typography.Text>
        </Col>
        <Col span={24}>
          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Button
                type="primary"
                icon={<IonIcon name="cloud-done-outline" />}
                onClick={() => {
                  dispatch(setVisibleActionCenter(false))
                  history.push('/sync')
                }}
                block
              >
                Backup
              </Button>
            </Col>
            <Col span={24}>
              <Button
                icon={<IonIcon name="archive-outline" />}
                onClick={() => {
                  dispatch(setVisibleActionCenter(false))
                  history.push('/sync?cid=')
                }}
                block
              >
                Restore
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  )
}

export default Sync
